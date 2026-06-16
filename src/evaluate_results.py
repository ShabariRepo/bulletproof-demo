"""CLI harness for honest Silver Bullet metrics."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from rich.console import Console
from rich.table import Table

from .evaluation import summarize


def main() -> int:
    console = Console()
    path = Path(__file__).parent.parent / "results.json"
    results = json.loads(path.read_text())
    summary = summarize(results)

    table = Table(title="Honest Metric Assertions", border_style="cyan", show_lines=True)
    table.add_column("Ticket", style="bold")
    table.add_column("Triage", justify="center")
    table.add_column("Resolution", justify="center")
    table.add_column("Failures")

    for result in summary["results"]:
        table.add_row(
            result["ticket_id"],
            "Y" if result["triage_correct"] else "N",
            "Y" if result["resolution_quality_correct"] else "N",
            "\n".join(result["resolution_failures"]),
        )

    console.print(table)
    console.print(
        f"Triage/escalation: {summary['triage_correct']}/{summary['total']} "
        f"({summary['triage_accuracy']:.0f}%)"
    )
    console.print(
        f"Resolution quality: {summary['resolution_correct']}/{summary['total']} "
        f"({summary['resolution_quality_accuracy']:.0f}%)"
    )
    return 0 if summary["triage_correct"] == summary["total"] and summary["resolution_correct"] == summary["total"] else 1


if __name__ == "__main__":
    sys.exit(main())
