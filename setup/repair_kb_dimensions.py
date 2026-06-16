"""
Repair Silver Bullet KBs — dimension-mismatch fix.

Root cause: the 5 bulletproof KBs were created with embedding_model="auto".
Auto-detect chose GCP text-embedding-005 (768 dims, clamped from 1024) at INGEST
time, so chunks are stored at 768 dims while the KB row records 1024. At SEARCH
time auto-detect resolves to a 1024-dim model, so the pgvector `<=>` query fails
with asyncpg DataError "different vector dimensions 1024 and 768" — which poisons
the agent-engine transaction and 500s the whole execute turn.

Fix: recreate each KB with an EXPLICIT 1024-dim model (amazon.titan-embed-text-v2:0,
native 1024, no dimension clamping — same model the org's known-good KBs use), so
stored chunks AND query embeddings are both 1024 dims. Then repoint the 5 agents
at the new KB ids.

API-level only. No prod DB DML, no deploy.

Usage:
    python -m setup.repair_kb_dimensions
"""

from __future__ import annotations

import asyncio
import os
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv
from rich.console import Console

sys.path.insert(0, str(Path(__file__).parent.parent))
from src.bonito_client import BonitoClient

console = Console()
BASE_DIR = Path(__file__).parent.parent

EMBED_MODEL = "amazon.titan-embed-text-v2:0"
EMBED_DIMS = 1024

# KB key -> (display_name, description, doc_path)
KB_DEFS = {
    "client-directory": ("Client Directory", "Bulletproof client directory and policies", "knowledge-bases/client-directory.md"),
    "password-procedures": ("Password Procedures", "Password reset and account procedures", "knowledge-bases/password-procedures.md"),
    "vpn-procedures": ("VPN Procedures", "VPN and connectivity procedures", "knowledge-bases/vpn-procedures.md"),
    "approved-software": ("Approved Software", "Approved and prohibited software policy", "knowledge-bases/approved-software.md"),
    "escalation-matrix": ("Escalation Matrix", "Escalation and SOC handoff matrix", "knowledge-bases/escalation-matrix.md"),
}

# Agent env key -> kb keys to link
AGENT_KB_MAP = {
    "TRIAGE_ROUTER_ID": ("Triage Router", ["client-directory", "escalation-matrix"]),
    "PASSWORD_SPECIALIST_ID": ("Password & Account Specialist", ["password-procedures", "client-directory"]),
    "CONNECTIVITY_SPECIALIST_ID": ("Connectivity & VPN Specialist", ["vpn-procedures", "client-directory"]),
    "SOFTWARE_SPECIALIST_ID": ("Software & Provisioning Specialist", ["approved-software", "client-directory"]),
    "GENERAL_SUPPORT_ID": ("General Support", ["client-directory", "escalation-matrix"]),
}


async def create_kb_explicit(client: BonitoClient, name: str, description: str) -> dict:
    """Create a KB with an explicit embedding model (client default is 'auto')."""
    async with httpx.AsyncClient(timeout=60.0) as http:
        resp = await http.post(
            f"{client.base_url}/api/knowledge-bases",
            headers=client._headers(),
            json={
                "name": name,
                "description": description,
                "source_type": "upload",
                "embedding_model": EMBED_MODEL,
                "embedding_dimensions": EMBED_DIMS,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def search_kb(client: BonitoClient, kb_id: str, query: str) -> tuple[int, str]:
    async with httpx.AsyncClient(timeout=60.0) as http:
        resp = await http.post(
            f"{client.base_url}/api/knowledge-bases/{kb_id}/search",
            headers=client._headers(),
            json={"query": query, "limit": 3},
        )
        return resp.status_code, resp.text[:300]


async def main():
    load_dotenv()
    client = BonitoClient()

    console.print("[bold cyan]Silver Bullet — Repair KB Dimensions[/]\n")

    # Step 1: find + delete the old (broken) KBs by name
    console.print("[bold]Step 1: Delete old auto-model KBs[/]")
    all_kbs = await client.list_knowledge_bases()
    for key, (name, _desc, _path) in KB_DEFS.items():
        for kb in all_kbs:
            if kb["name"] == name:
                console.print(f"  Deleting old '{name}' ({kb['id']}, model={kb.get('embedding_model')})")
                try:
                    await client.delete_knowledge_base(kb["id"])
                except Exception as e:
                    console.print(f"    [yellow]delete failed: {e}[/]")

    # Step 2: recreate with explicit titan v2 (1024) + upload docs
    console.print("\n[bold]Step 2: Recreate with explicit 1024-dim model + upload[/]")
    kb_ids: dict[str, str] = {}
    for key, (name, desc, path) in KB_DEFS.items():
        kb = await create_kb_explicit(client, name, desc)
        kb_ids[key] = kb["id"]
        console.print(f"  Created '{name}' -> {kb['id']} (model={kb.get('embedding_model')}, dims={kb.get('embedding_dimensions')})")
        doc_file = BASE_DIR / path
        await client.upload_document(kb["id"], str(doc_file))
        console.print(f"    uploaded {path}")

    # Step 3: wait for ingestion
    console.print("\n[bold]Step 3: Wait for ingestion[/]")
    for i in range(9):
        time.sleep(10)
        console.print(f"  {(i + 1) * 10}s...")

    # Step 4: verify chunks + that search returns 200 (no dimension error)
    console.print("\n[bold]Step 4: Verify chunks + search succeeds[/]")
    all_ok = True
    refreshed = await client.list_knowledge_bases()
    by_id = {kb["id"]: kb for kb in refreshed}
    for key, (name, _desc, _path) in KB_DEFS.items():
        kid = kb_ids[key]
        kb = by_id.get(kid, {})
        chunks = kb.get("chunk_count", 0)
        status = kb.get("status", "?")
        code, body = await search_kb(client, kid, "password reset lockout VPN client policy")
        ok = code == 200 and chunks > 0
        color = "green" if ok else "red"
        console.print(f"  [{color}]{name}: chunks={chunks} status={status} search_http={code}[/]")
        if not ok:
            console.print(f"    [yellow]{body}[/]")
            all_ok = False

    # Step 5: repoint agents
    console.print("\n[bold]Step 5: Repoint agents at new KB ids[/]")
    for env_key, (display, kb_keys) in AGENT_KB_MAP.items():
        agent_id = os.getenv(env_key)
        if not agent_id:
            console.print(f"  [red]missing {env_key}[/]")
            continue
        ids = [kb_ids[k] for k in kb_keys if k in kb_ids]
        await client.update_agent(agent_id, {"knowledge_base_ids": ids})
        console.print(f"  [green]{display}: linked {len(ids)} KBs[/]")

    console.print()
    console.print("[bold green]DONE — KBs repaired.[/]" if all_ok else "[bold yellow]Some KBs not ready; re-run or wait.[/]")
    # Emit kb ids for the report
    for k, v in kb_ids.items():
        console.print(f"  {k} = {v}")


if __name__ == "__main__":
    asyncio.run(main())
