"""
Silver Bullet — Demo Report Generator

Prints a Rich-formatted summary of the demo run results.
"""

from __future__ import annotations

from typing import Any

from rich.console import Console
from rich.panel import Panel
from rich.table import Table


def print_report(results: list[dict[str, Any]]) -> None:
    """Print a formatted summary report of the demo run."""
    console = Console()

    # Header
    console.print()
    console.print(Panel(
        "[bold]Silver Bullet — Bulletproof Tier 1 Support Demo Results[/]",
        border_style="cyan",
    ))

    # Results table
    table = Table(title="Ticket Results", border_style="cyan", show_lines=True)
    table.add_column("ID", style="bold", width=8)
    table.add_column("Type", width=16)
    table.add_column("Expected", width=20)
    table.add_column("Actual", width=20)
    table.add_column("Match", width=5, justify="center")
    table.add_column("Sev", width=4, justify="center")
    table.add_column("Conf", width=5, justify="right")
    table.add_column("Time", width=6, justify="right")
    table.add_column("Model", width=14)

    correct = 0
    total_time = 0.0
    total_tokens = 0
    total_cost = 0.0

    for r in results:
        match = r.get("routing_correct", False)
        if match:
            correct += 1
        match_icon = "[green]Y[/]" if match else "[red]N[/]"
        elapsed = r.get("elapsed_seconds", 0)
        total_time += elapsed
        total_tokens += r.get("tokens", 0)
        total_cost += float(r.get("cost", 0) or 0)

        table.add_row(
            r["ticket_id"],
            r["ticket_type"],
            r["expected_routing"],
            r["actual_routing"],
            match_icon,
            r.get("severity", "?"),
            str(r.get("confidence", "?")),
            f"{elapsed:.1f}s",
            r.get("model_used", "?"),
        )

    console.print(table)

    # Summary stats
    n = len(results)
    accuracy = correct / n * 100 if n else 0
    avg_time = total_time / n if n else 0

    summary = Table.grid(padding=(0, 2))
    summary.add_column(style="bold cyan")
    summary.add_column()
    summary.add_row("Tickets processed:", str(n))
    summary.add_row("Routing accuracy:", f"{correct}/{n} ({accuracy:.0f}%)")
    summary.add_row("Avg response time:", f"{avg_time:.1f}s")
    summary.add_row("Total time:", f"{total_time:.1f}s")
    summary.add_row("Total tokens:", f"{total_tokens:,}")
    summary.add_row("Total cost:", f"${total_cost:.4f}")

    console.print(Panel(summary, title="[bold]Summary[/]", border_style="cyan"))

    # Misrouted tickets
    misrouted = [r for r in results if not r.get("routing_correct", False)]
    if misrouted:
        console.print(f"\n[bold red]Misrouted tickets ({len(misrouted)}):[/]")
        for r in misrouted:
            console.print(f"  {r['ticket_id']}: expected={r['expected_routing']}, got={r['actual_routing']}")
    else:
        console.print("\n[bold green]All tickets routed correctly![/]")

    console.print()
