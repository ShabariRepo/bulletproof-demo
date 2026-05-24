"""
Silver Bullet — Sentinel Alert Simulator

Formats and sends a Microsoft Sentinel-style alert payload to the
Triage Router agent on Bonito. Can be run standalone.
"""

from __future__ import annotations

import asyncio
import os

from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel

from .bonito_client import BonitoClient


SENTINEL_ALERT = {
    "id": "INC-2026-0542",
    "severity": "High",
    "title": "Multiple failed login attempts followed by successful login from unusual location",
    "status": "New",
    "entities": [
        {"type": "account", "value": "j.martinez@mapleridge.ca"},
        {"type": "ip", "value": "203.0.113.42"},
        {"type": "geo", "value": "Lagos, Nigeria"},
    ],
    "tactics": ["InitialAccess"],
    "techniques": ["T1078 - Valid Accounts"],
    "client": "Maple Ridge Municipality",
    "incident_url": "https://portal.azure.com/incidents/INC-2026-0542",
    "description": (
        "User j.martinez@mapleridge.ca had 12 failed login attempts from IP 203.0.113.42 "
        "(Lagos, Nigeria) followed by a successful login at 03:42 UTC. "
        "User's normal location is Ontario, Canada. No travel request on file."
    ),
}


def format_sentinel_message(alert: dict) -> str:
    """Format a Sentinel alert as a support ticket message."""
    entities_str = "\n".join(f"  - {e['type']}: {e['value']}" for e in alert["entities"])
    return (
        f"MICROSOFT SENTINEL ALERT\n"
        f"========================\n"
        f"Incident ID: {alert['id']}\n"
        f"Severity: {alert['severity']}\n"
        f"Title: {alert['title']}\n"
        f"Client: {alert['client']}\n"
        f"MITRE Tactics: {', '.join(alert['tactics'])}\n"
        f"MITRE Techniques: {', '.join(alert['techniques'])}\n"
        f"Entities:\n{entities_str}\n"
        f"Incident URL: {alert['incident_url']}\n\n"
        f"Description:\n{alert['description']}"
    )


async def run_sentinel_alert():
    """Send the Sentinel alert to the Triage Router."""
    load_dotenv()
    console = Console()

    triage_router_id = os.getenv("TRIAGE_ROUTER_ID", "")
    if not triage_router_id:
        console.print("[red]TRIAGE_ROUTER_ID not set in .env[/]")
        return

    client = BonitoClient()
    message = format_sentinel_message(SENTINEL_ALERT)

    console.print(Panel(
        message,
        title="[bold red]Sentinel Alert → Triage Router[/]",
        border_style="red",
    ))

    result = await client.execute_agent(
        agent_id=triage_router_id,
        message=message,
        timeout=90.0,
    )

    console.print(Panel(
        result.get("content", "No response"),
        title=f"[bold cyan]Triage Router Response ({result.get('elapsed', '?')}s)[/]",
        border_style="cyan",
    ))


def main():
    asyncio.run(run_sentinel_alert())


if __name__ == "__main__":
    main()
