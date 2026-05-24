"""
Silver Bullet — Ticket Runner

Sends a single support ticket to the Triage Router agent on Bonito
and collects the result including delegation chain and timing.
"""

from __future__ import annotations

import time
from typing import Any

from .bonito_client import BonitoClient


async def run_ticket(
    client: BonitoClient,
    ticket: dict[str, Any],
    triage_router_id: str,
) -> dict[str, Any]:
    """Send one ticket through the Triage Router pipeline.

    The Triage Router will:
    1. Classify the ticket
    2. Search KBs for client context
    3. Either invoke_agent to a specialist or escalate

    Args:
        client: Authenticated Bonito client.
        ticket: Dict with id, type, subject, body, expected_routing.
        triage_router_id: UUID of the Triage Router agent.

    Returns:
        Result dict with ticket info, response, timing, and model used.
    """
    # Format ticket as a natural support request
    message = (
        f"NEW SUPPORT TICKET [{ticket['id']}]\n"
        f"Subject: {ticket['subject']}\n\n"
        f"{ticket['body']}"
    )

    start = time.monotonic()
    result = await client.execute_agent(
        agent_id=triage_router_id,
        message=message,
        timeout=90.0,  # Triage Router may invoke_agent which adds latency
    )
    elapsed = time.monotonic() - start

    # Try to parse structured JSON from response
    parsed = client.parse_json(result.get("content", ""))

    # Determine actual routing from the response
    actual_routing = "unknown"
    if parsed:
        action = parsed.get("action", "")
        specialist = parsed.get("specialist", "")
        if action == "escalate":
            actual_routing = "ESCALATION"
        elif specialist:
            actual_routing = specialist
        elif action == "delegate":
            classification = parsed.get("classification", "")
            routing_map = {
                "password_account": "password-specialist",
                "connectivity_vpn": "connectivity-specialist",
                "software_provisioning": "software-specialist",
                "hardware_general": "general-support",
            }
            actual_routing = routing_map.get(classification, classification)

    return {
        "ticket_id": ticket["id"],
        "ticket_type": ticket["type"],
        "subject": ticket["subject"],
        "expected_routing": ticket.get("expected_routing", "unknown"),
        "actual_routing": actual_routing,
        "routing_correct": _check_routing(ticket.get("expected_routing", ""), actual_routing),
        "severity": parsed.get("severity", "unknown"),
        "confidence": parsed.get("confidence", 0),
        "classification": parsed.get("classification", "unknown"),
        "response": result.get("content", ""),
        "parsed": parsed,
        "model_used": result.get("model_used", "unknown"),
        "tokens": result.get("tokens", 0),
        "cost": result.get("cost", 0),
        "session_id": result.get("session_id"),
        "elapsed_seconds": round(elapsed, 1),
    }


def _check_routing(expected: str, actual: str) -> bool:
    """Check if actual routing matches expected (fuzzy match)."""
    if not expected or not actual:
        return False
    expected = expected.lower().strip()
    actual = actual.lower().strip()
    # Direct match
    if expected == actual:
        return True
    # Partial match (e.g., "password" matches "password-specialist")
    if expected in actual or actual in expected:
        return True
    # Both are escalation
    if "escalat" in expected and "escalat" in actual:
        return True
    return False
