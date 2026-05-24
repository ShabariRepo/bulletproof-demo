"""
Silver Bullet — Halo ITSM Mock Server

Minimal FastAPI server that mimics Halo PSA's ticket API.
Logs every API call with Rich formatting for demo visibility.
"""

import uuid
from datetime import datetime, timezone

from fastapi import FastAPI
from pydantic import BaseModel
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

app = FastAPI(title="Halo ITSM Mock", version="1.0")
console = Console()

# In-memory ticket store
tickets: dict[str, dict] = {}
ticket_counter = 1000


class TicketCreate(BaseModel):
    summary: str
    details: str = ""
    client_name: str = ""
    category: str = ""
    priority: str = "P4"
    status: str = "new"


class TicketUpdate(BaseModel):
    status: str | None = None
    details: str | None = None
    priority: str | None = None


class TicketNote(BaseModel):
    note: str
    is_internal: bool = False


@app.post("/api/Tickets")
async def create_ticket(ticket: TicketCreate):
    global ticket_counter
    ticket_counter += 1
    ticket_id = f"HALO-{ticket_counter}"
    tickets[ticket_id] = {
        "id": ticket_id,
        "summary": ticket.summary,
        "details": ticket.details,
        "client_name": ticket.client_name,
        "category": ticket.category,
        "priority": ticket.priority,
        "status": ticket.status,
        "notes": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    console.print(Panel(
        f"[bold green]TICKET CREATED[/]\n"
        f"ID: {ticket_id}\n"
        f"Client: {ticket.client_name}\n"
        f"Category: {ticket.category}\n"
        f"Priority: {ticket.priority}\n"
        f"Summary: {ticket.summary}\n"
        f"Status: {ticket.status}",
        title="[cyan]Halo ITSM[/]",
        border_style="green",
    ))

    return {"id": ticket_id, "status": ticket.status, "created_at": tickets[ticket_id]["created_at"]}


@app.put("/api/Tickets/{ticket_id}")
async def update_ticket(ticket_id: str, update: TicketUpdate):
    if ticket_id not in tickets:
        return {"error": "Ticket not found"}, 404

    t = tickets[ticket_id]
    if update.status:
        t["status"] = update.status
    if update.details:
        t["details"] = update.details
    if update.priority:
        t["priority"] = update.priority

    console.print(Panel(
        f"[bold yellow]TICKET UPDATED[/]\n"
        f"ID: {ticket_id}\n"
        f"New Status: {update.status or 'unchanged'}\n"
        f"New Priority: {update.priority or 'unchanged'}",
        title="[cyan]Halo ITSM[/]",
        border_style="yellow",
    ))

    return {"id": ticket_id, "status": t["status"]}


@app.post("/api/Tickets/{ticket_id}/Notes")
async def add_note(ticket_id: str, note: TicketNote):
    if ticket_id not in tickets:
        return {"error": "Ticket not found"}, 404

    tickets[ticket_id]["notes"].append({
        "note": note.note,
        "is_internal": note.is_internal,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    console.print(Panel(
        f"[bold blue]NOTE ADDED[/]\n"
        f"Ticket: {ticket_id}\n"
        f"Internal: {note.is_internal}\n"
        f"Note: {note.note[:200]}",
        title="[cyan]Halo ITSM[/]",
        border_style="blue",
    ))

    return {"ticket_id": ticket_id, "note_count": len(tickets[ticket_id]["notes"])}


@app.get("/api/Tickets/{ticket_id}")
async def get_ticket(ticket_id: str):
    if ticket_id not in tickets:
        return {"error": "Ticket not found"}, 404
    return tickets[ticket_id]


@app.get("/api/Tickets")
async def list_tickets():
    return {"tickets": list(tickets.values()), "count": len(tickets)}


@app.get("/health")
async def health():
    return {"status": "healthy", "tickets_count": len(tickets)}


def main():
    import uvicorn
    console.print("[bold cyan]Starting Halo ITSM Mock Server on port 8090...[/]")
    uvicorn.run(app, host="0.0.0.0", port=8090, log_level="warning")


if __name__ == "__main__":
    main()
