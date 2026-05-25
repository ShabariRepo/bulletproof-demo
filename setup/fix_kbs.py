"""
Fix Silver Bullet KBs after migration 041 deploys.

1. Deletes failed documents (0 chunks) from each KB
2. Re-uploads the KB documents
3. Updates each agent's knowledge_base_ids

Usage:
    python -m setup.fix_kbs
"""

from __future__ import annotations

import asyncio
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from rich.console import Console

sys.path.insert(0, str(Path(__file__).parent.parent))
from src.bonito_client import BonitoClient

console = Console()
BASE_DIR = Path(__file__).parent.parent

# KB key -> (display_name, doc_path)
KB_DEFS = {
    "client-directory": ("Client Directory", "knowledge-bases/client-directory.md"),
    "password-procedures": ("Password Procedures", "knowledge-bases/password-procedures.md"),
    "vpn-procedures": ("VPN Procedures", "knowledge-bases/vpn-procedures.md"),
    "approved-software": ("Approved Software", "knowledge-bases/approved-software.md"),
    "escalation-matrix": ("Escalation Matrix", "knowledge-bases/escalation-matrix.md"),
}

# Agent key -> (display_name, kb_keys)
AGENT_KB_MAP = {
    "triage-router": ("Triage Router", ["client-directory", "escalation-matrix"]),
    "password-specialist": ("Password & Account Specialist", ["password-procedures", "client-directory"]),
    "connectivity-specialist": ("Connectivity & VPN Specialist", ["vpn-procedures", "client-directory"]),
    "software-specialist": ("Software & Provisioning Specialist", ["approved-software", "client-directory"]),
    "general-support": ("General Support", ["client-directory", "escalation-matrix"]),
}

# Agent IDs from .env
AGENT_ENV_KEYS = {
    "triage-router": "TRIAGE_ROUTER_ID",
    "password-specialist": "PASSWORD_SPECIALIST_ID",
    "connectivity-specialist": "CONNECTIVITY_SPECIALIST_ID",
    "software-specialist": "SOFTWARE_SPECIALIST_ID",
    "general-support": "GENERAL_SUPPORT_ID",
}


async def main():
    load_dotenv()
    client = BonitoClient()

    console.print("[bold cyan]Silver Bullet — Fix KBs & Agent References[/]\n")

    # Step 1: Find existing KBs
    console.print("[bold]Step 1: Finding existing KBs[/]")
    all_kbs = await client.list_knowledge_bases()
    kb_name_to_id: dict[str, str] = {}
    kb_ids: dict[str, str] = {}

    for key, (name, _) in KB_DEFS.items():
        match = next((kb for kb in all_kbs if kb["name"] == name), None)
        if match:
            kb_ids[key] = match["id"]
            console.print(f"  [green]Found KB '{name}': {match['id']}[/]")
        else:
            console.print(f"  [red]KB '{name}' not found![/]")

    # Step 2: Delete failed documents and re-upload
    console.print("\n[bold]Step 2: Clean up failed docs & re-upload[/]")
    for key, (name, doc_path) in KB_DEFS.items():
        if key not in kb_ids:
            continue

        kb_id = kb_ids[key]

        # List and delete existing docs
        try:
            docs = await client.list_documents(kb_id)
            for doc in docs:
                doc_id = doc.get("id")
                doc_name = doc.get("filename", doc.get("name", "?"))
                chunk_count = doc.get("chunk_count", 0)
                console.print(f"  Deleting {doc_name} ({chunk_count} chunks) from {name}")
                try:
                    await client.delete_document(kb_id, doc_id)
                except Exception as e:
                    console.print(f"    [yellow]Delete failed: {e}[/]")
        except Exception as e:
            console.print(f"  [yellow]List docs failed for {name}: {e}[/]")

        # Re-upload
        doc_file = BASE_DIR / doc_path
        if doc_file.exists():
            try:
                await client.upload_document(kb_id, str(doc_file))
                console.print(f"  [green]Uploaded {doc_path} to {name}[/]")
            except Exception as e:
                console.print(f"  [red]Upload failed for {doc_path}: {e}[/]")
        else:
            console.print(f"  [red]File not found: {doc_path}[/]")

    # Step 3: Wait for processing
    console.print("\n[bold]Step 3: Waiting for processing (60s)...[/]")
    for i in range(6):
        time.sleep(10)
        console.print(f"  {(i + 1) * 10}s...")

    # Step 4: Verify chunks
    console.print("\n[bold]Step 4: Verifying chunk counts[/]")
    all_ok = True
    for key, (name, _) in KB_DEFS.items():
        if key not in kb_ids:
            continue
        try:
            docs = await client.list_documents(kb_ids[key])
            for doc in docs:
                chunks = doc.get("chunk_count", 0)
                status = doc.get("status", "?")
                if chunks > 0:
                    console.print(f"  [green]{name}: {chunks} chunks ({status})[/]")
                else:
                    console.print(f"  [red]{name}: {chunks} chunks ({status}) — STILL PROCESSING?[/]")
                    all_ok = False
        except Exception as e:
            console.print(f"  [red]{name}: {e}[/]")
            all_ok = False

    # Step 5: Update agent KB references
    console.print("\n[bold]Step 5: Updating agent KB references[/]")
    for agent_key, (display_name, agent_kb_keys) in AGENT_KB_MAP.items():
        env_key = AGENT_ENV_KEYS[agent_key]
        agent_id = os.getenv(env_key)
        if not agent_id:
            console.print(f"  [red]No agent ID for {agent_key} ({env_key})[/]")
            continue

        agent_kb_ids = [kb_ids[k] for k in agent_kb_keys if k in kb_ids]
        try:
            await client.update_agent(agent_id, {"knowledge_base_ids": agent_kb_ids})
            console.print(f"  [green]{display_name}: updated with {len(agent_kb_ids)} KBs[/]")
        except Exception as e:
            console.print(f"  [red]{display_name}: {e}[/]")

    console.print()
    if all_ok:
        console.print("[bold green]All KBs have chunks! Ready to run the demo.[/]")
    else:
        console.print("[bold yellow]Some KBs still processing. Wait and re-check, or re-run this script.[/]")
    console.print("\nRun the demo: python -m src.run_demo")


if __name__ == "__main__":
    asyncio.run(main())
