"""
Silver Bullet — Provision Agents & KBs on Bonito Prod

Creates 5 knowledge bases, uploads documents, creates 5 agents,
and establishes delegation connections. Idempotent — skips
resources that already exist.

Usage:
    python -m setup.provision
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

sys.path.insert(0, str(Path(__file__).parent.parent))
from src.bonito_client import BonitoClient

console = Console()
BASE_DIR = Path(__file__).parent.parent

# KB definitions: key -> (name, description, document path)
KB_DEFS = {
    "client-directory": (
        "Client Directory",
        "6 mock clients with environments, policies, and contacts",
        "knowledge-bases/client-directory.md",
    ),
    "password-procedures": (
        "Password Procedures",
        "Per-IdP password reset, MFA, and account unlock procedures",
        "knowledge-bases/password-procedures.md",
    ),
    "vpn-procedures": (
        "VPN Procedures",
        "Error-code indexed VPN troubleshooting trees",
        "knowledge-bases/vpn-procedures.md",
    ),
    "approved-software": (
        "Approved Software",
        "Per-client approved and prohibited software lists",
        "knowledge-bases/approved-software.md",
    ),
    "escalation-matrix": (
        "Escalation Matrix",
        "Severity definitions, escalation contacts, always-escalate rules",
        "knowledge-bases/escalation-matrix.md",
    ),
}

# Agent definitions: key -> (display_name, prompt_path, model, kb_keys, tool_policy)
AGENT_DEFS = {
    # Router: gpt-4o-mini — fast classification, cheap, proven 10/10 routing
    "triage-router": (
        "Triage Router",
        "agents/triage-router/system-prompt.md",
        "gpt-4o-mini",
        ["client-directory", "escalation-matrix"],
        {"mode": "allowlist", "allowed": ["invoke_agent", "search_knowledge_base"]},
    ),
    # Password: Claude Sonnet — handles compliance (PHIPA, GLI), break-glass,
    # security-adjacent decisions that need stronger reasoning
    "password-specialist": (
        "Password & Account Specialist",
        "agents/password-specialist/system-prompt.md",
        "claude-sonnet-4-6-20250620",
        ["password-procedures", "client-directory"],
        {"mode": "allowlist", "allowed": ["search_knowledge_base", "http_request"],
         "http_allowlist": ["http://localhost:8090/*"]},
    ),
    # Connectivity: Groq Llama — VPN troubleshooting is procedural, speed wins
    "connectivity-specialist": (
        "Connectivity & VPN Specialist",
        "agents/connectivity-specialist/system-prompt.md",
        "llama-3.3-70b-versatile",
        ["vpn-procedures", "client-directory"],
        {"mode": "allowlist", "allowed": ["search_knowledge_base", "http_request"],
         "http_allowlist": ["http://localhost:8090/*"]},
    ),
    # Software: Groq Llama — approve/deny is straightforward, fast turnaround
    "software-specialist": (
        "Software & Provisioning Specialist",
        "agents/software-specialist/system-prompt.md",
        "llama-3.3-70b-versatile",
        ["approved-software", "client-directory"],
        {"mode": "allowlist", "allowed": ["search_knowledge_base", "http_request"],
         "http_allowlist": ["http://localhost:8090/*"]},
    ),
    # General: Groq Llama — hardware triage is simple, speed matters
    "general-support": (
        "General Support",
        "agents/general-support/system-prompt.md",
        "llama-3.3-70b-versatile",
        ["client-directory", "escalation-matrix"],
        {"mode": "allowlist", "allowed": ["search_knowledge_base", "http_request"],
         "http_allowlist": ["http://localhost:8090/*"]},
    ),
}

# Connections: triage-router delegates to all specialists
CONNECTIONS = [
    ("triage-router", "password-specialist", "handoff"),
    ("triage-router", "connectivity-specialist", "handoff"),
    ("triage-router", "software-specialist", "handoff"),
    ("triage-router", "general-support", "handoff"),
]


async def main():
    load_dotenv()

    client = BonitoClient()

    console.print("[bold cyan]Silver Bullet — Provisioning on Bonito Prod[/]\n")

    # ── Step 0: Find or create project ──
    project_id = os.getenv("PROJECT_ID", "")
    if not project_id:
        console.print("[bold]Step 0: Finding/Creating Project[/]")
        projects = await client.list_projects()
        existing = next((p for p in projects if p["name"] == "Silver Bullet"), None)
        if existing:
            project_id = existing["id"]
            console.print(f"  [dim]Project 'Silver Bullet' already exists: {project_id}[/]")
        else:
            project = await client.create_project("Silver Bullet", "Bulletproof Tier 1 Support Demo")
            project_id = project["id"]
            console.print(f"  [green]Created project 'Silver Bullet': {project_id}[/]")
        # Write to .env
        env_path = BASE_DIR / ".env"
        if env_path.exists():
            import re
            content = env_path.read_text()
            content = re.sub(r"^PROJECT_ID=.*$", f"PROJECT_ID={project_id}", content, flags=re.MULTILINE)
            env_path.write_text(content)
        console.print()

    # ── Step 1: Create Knowledge Bases ──
    console.print("[bold]Step 1: Knowledge Bases[/]")
    existing_kbs = await client.list_knowledge_bases()
    kb_name_to_id = {kb["name"]: kb["id"] for kb in existing_kbs}
    kb_ids: dict[str, str] = {}

    for key, (name, desc, doc_path) in KB_DEFS.items():
        if name in kb_name_to_id:
            kb_ids[key] = kb_name_to_id[name]
            console.print(f"  [dim]KB '{name}' already exists: {kb_ids[key]}[/]")
        else:
            try:
                kb = await client.create_knowledge_base(name, desc)
                kb_ids[key] = kb["id"]
                console.print(f"  [green]Created KB '{name}': {kb_ids[key]}[/]")
            except Exception as e:
                console.print(f"  [red]Failed to create KB '{name}': {e}[/]")
                continue

        # Upload document
        doc_file = BASE_DIR / doc_path
        if doc_file.exists():
            try:
                await client.upload_document(kb_ids[key], str(doc_file))
                console.print(f"    [green]Uploaded {doc_path}[/]")
            except Exception as e:
                console.print(f"    [yellow]Upload skipped ({e})[/]")

    console.print()

    # ── Step 2: Create Agents ──
    console.print("[bold]Step 2: Agents[/]")
    existing_agents = await client.list_agents(project_id)
    agent_name_to_id = {a["name"]: a["id"] for a in existing_agents}
    agent_ids: dict[str, str] = {}

    for key, (display_name, prompt_path, model, kb_keys, tool_policy) in AGENT_DEFS.items():
        if display_name in agent_name_to_id:
            agent_ids[key] = agent_name_to_id[display_name]
            console.print(f"  [dim]Agent '{display_name}' already exists: {agent_ids[key]}[/]")
        else:
            # Read system prompt
            prompt_file = BASE_DIR / prompt_path
            system_prompt = prompt_file.read_text() if prompt_file.exists() else f"You are {display_name}."

            # Resolve KB IDs
            agent_kb_ids = [kb_ids[k] for k in kb_keys if k in kb_ids]

            agent_data = {
                "name": display_name,
                "description": f"Silver Bullet — {display_name}",
                "system_prompt": system_prompt,
                "model_id": model,
                "knowledge_base_ids": agent_kb_ids,
                "tool_policy": tool_policy,
            }

            try:
                agent = await client.create_agent(project_id, agent_data)
                agent_ids[key] = agent["id"]
                console.print(f"  [green]Created agent '{display_name}': {agent_ids[key]}[/]")
            except Exception as e:
                console.print(f"  [red]Failed to create agent '{display_name}': {e}[/]")

    console.print()

    # ── Step 3: Create Connections ──
    console.print("[bold]Step 3: Agent Connections[/]")
    for source_key, target_key, conn_type in CONNECTIONS:
        if source_key not in agent_ids or target_key not in agent_ids:
            console.print(f"  [yellow]Skipping {source_key} → {target_key} (missing agent)[/]")
            continue

        try:
            await client.create_connection(
                agent_ids[source_key],
                agent_ids[target_key],
                conn_type,
                label=AGENT_DEFS[target_key][0],
            )
            console.print(f"  [green]{source_key} → {target_key} ({conn_type})[/]")
        except Exception as e:
            if "already exists" in str(e).lower() or "409" in str(e):
                console.print(f"  [dim]{source_key} → {target_key} (already connected)[/]")
            else:
                console.print(f"  [yellow]{source_key} → {target_key}: {e}[/]")

    console.print()

    # ── Step 4: Write .env ──
    env_lines = [
        f"TRIAGE_ROUTER_ID={agent_ids.get('triage-router', '')}",
        f"PASSWORD_SPECIALIST_ID={agent_ids.get('password-specialist', '')}",
        f"CONNECTIVITY_SPECIALIST_ID={agent_ids.get('connectivity-specialist', '')}",
        f"SOFTWARE_SPECIALIST_ID={agent_ids.get('software-specialist', '')}",
        f"GENERAL_SUPPORT_ID={agent_ids.get('general-support', '')}",
    ]

    # Update .env file (append or update agent IDs)
    env_path = BASE_DIR / ".env"
    if env_path.exists():
        existing = env_path.read_text()
        for line in env_lines:
            key = line.split("=")[0]
            if key in existing:
                # Replace existing line
                import re
                existing = re.sub(rf"^{key}=.*$", line, existing, flags=re.MULTILINE)
            else:
                existing += f"\n{line}"
        env_path.write_text(existing)
    else:
        # Copy from .env.example and append
        example = (BASE_DIR / ".env.example").read_text()
        for line in env_lines:
            key = line.split("=")[0]
            example = example.replace(f"{key}=", line.split("=")[0] + "=" + line.split("=", 1)[1])
        env_path.write_text(example)

    # Summary table
    table = Table(title="Provisioned Resources", border_style="cyan")
    table.add_column("Resource", style="bold")
    table.add_column("ID")
    for key, aid in agent_ids.items():
        table.add_row(f"Agent: {key}", aid)
    for key, kid in kb_ids.items():
        table.add_row(f"KB: {key}", kid)
    console.print(table)

    console.print("\n[bold green]Provisioning complete![/]")
    console.print(f"Agent IDs written to {env_path}")
    console.print("\nRun the demo:")
    console.print("  python -m src.run_demo")


if __name__ == "__main__":
    asyncio.run(main())
