"""
Silver Bullet — Demo Runner

Runs all 10 demo tickets through the Triage Router on Bonito prod.
Prints progress, individual results, and a summary report.

Usage:
    python -m src.run_demo                    # Run all tickets
    python -m src.run_demo --ticket BP-004    # Run single ticket
    python -m src.run_demo --halo             # Start Halo mock server too
"""

from __future__ import annotations

import asyncio
import os
import sys
import threading
from pathlib import Path

import yaml
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn

from .bonito_client import BonitoClient
from .ticket_runner import run_ticket
from .report import print_report


console = Console()


def load_tickets(ticket_id: str | None = None) -> list[dict]:
    """Load demo tickets from YAML."""
    path = Path(__file__).parent.parent / "tickets" / "demo-tickets.yaml"
    with open(path) as f:
        data = yaml.safe_load(f)

    tickets = data.get("tickets", [])
    if ticket_id:
        tickets = [t for t in tickets if t["id"] == ticket_id]
        if not tickets:
            console.print(f"[red]Ticket {ticket_id} not found[/]")
            sys.exit(1)

    return tickets


def start_halo_mock():
    """Start the Halo mock server in a background thread."""
    import uvicorn
    from .halo_mock import app

    def _run():
        uvicorn.run(app, host="0.0.0.0", port=8090, log_level="warning")

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    console.print("[dim]Halo ITSM mock server started on port 8090[/]")


async def main():
    load_dotenv()

    # Parse args
    single_ticket = None
    run_halo = "--halo" in sys.argv
    for arg in sys.argv:
        if arg.startswith("--ticket="):
            single_ticket = arg.split("=")[1]
        elif arg.startswith("--ticket") and sys.argv.index(arg) + 1 < len(sys.argv):
            idx = sys.argv.index(arg)
            if idx + 1 < len(sys.argv) and not sys.argv[idx + 1].startswith("--"):
                single_ticket = sys.argv[idx + 1]

    # Validate env
    triage_router_id = os.getenv("TRIAGE_ROUTER_ID", "")
    if not triage_router_id:
        console.print("[red]TRIAGE_ROUTER_ID not set. Run setup/provision.py first.[/]")
        sys.exit(1)

    # Start Halo mock if requested
    if run_halo:
        start_halo_mock()
        await asyncio.sleep(1)  # Let it start

    # Load tickets
    tickets = load_tickets(single_ticket)

    # Header
    console.print()
    console.print(Panel(
        f"[bold]Silver Bullet — Bulletproof Tier 1 Support Demo[/]\n"
        f"Triage Router: {triage_router_id}\n"
        f"Tickets: {len(tickets)}\n"
        f"Bonito: {os.getenv('BONITO_URL', 'https://api.getbonito.com')}",
        border_style="cyan",
    ))

    # Initialize client
    client = BonitoClient()

    # Run tickets
    results = []
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running tickets...", total=len(tickets))

        for i, ticket in enumerate(tickets):
            progress.update(task, description=f"[{i+1}/{len(tickets)}] {ticket['id']}: {ticket['subject'][:50]}")

            try:
                result = await run_ticket(client, ticket, triage_router_id)
                results.append(result)

                # Print individual result
                match = result.get("routing_correct", False)
                match_str = "[green]CORRECT[/]" if match else "[red]MISMATCH[/]"
                console.print(
                    f"  {result['ticket_id']} → {result['actual_routing']} "
                    f"(expected: {result['expected_routing']}) {match_str} "
                    f"[dim]{result['elapsed_seconds']}s[/]"
                )

            except Exception as e:
                console.print(f"  [red]{ticket['id']} FAILED: {e}[/]")
                results.append({
                    "ticket_id": ticket["id"],
                    "ticket_type": ticket["type"],
                    "subject": ticket["subject"],
                    "expected_routing": ticket.get("expected_routing", "unknown"),
                    "actual_routing": "ERROR",
                    "routing_correct": False,
                    "severity": "?",
                    "confidence": 0,
                    "classification": "error",
                    "response": str(e),
                    "parsed": {},
                    "model_used": "none",
                    "tokens": 0,
                    "cost": 0,
                    "session_id": None,
                    "elapsed_seconds": 0,
                })

            progress.advance(task)

            # Small delay between tickets (avoid rate limiting)
            if i < len(tickets) - 1:
                await asyncio.sleep(1)

    # Print summary report
    print_report(results)

    # Save raw results
    import json
    output_path = Path(__file__).parent.parent / "results.json"
    with open(output_path, "w") as f:
        # Remove full response text for cleaner output
        clean = []
        for r in results:
            c = dict(r)
            if len(c.get("response", "")) > 500:
                c["response"] = c["response"][:500] + "..."
            clean.append(c)
        json.dump(clean, f, indent=2, default=str)
    console.print(f"[dim]Raw results saved to {output_path}[/]")


if __name__ == "__main__":
    asyncio.run(main())
