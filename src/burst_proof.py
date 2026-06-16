"""Burst proof — fire N concurrent tickets at the triage agent to trip the
RPM ceiling, so the Agent HPA autoscaler scales up and the overflow queue
catches the excess. Reads real /scaling, /scaling/events, /queue afterward.

Usage: python -m src.burst_proof [N]
"""
from __future__ import annotations

import asyncio
import os
import sys
import time

import httpx
from dotenv import load_dotenv

load_dotenv()
BASE = os.getenv("BONITO_URL", "https://api.getbonito.com").rstrip("/")
TOKEN = os.getenv("BONITO_API_TOKEN", "")
TRIAGE = os.getenv("TRIAGE_ROUTER_ID", "")
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

TICKETS = [
    "Subject: Password reset\n\nUser j.martin can't log in, account says locked.",
    "Subject: VPN won't connect\n\nRemote user gets error connecting to the corporate VPN.",
    "Subject: Need Adobe\n\nDesigner requests Adobe Creative Cloud install approval.",
    "Subject: Laptop won't boot\n\nDell Latitude won't power on after an update.",
    "Subject: Suspicious login\n\nSentinel flags an impossible-travel sign-in for an exec.",
    "Subject: MFA broken\n\nUser lost phone, can't pass MFA, needs re-enrollment.",
]


async def fire_one(client: httpx.AsyncClient, i: int) -> dict:
    msg = TICKETS[i % len(TICKETS)]
    t0 = time.monotonic()
    try:
        r = await client.post(
            f"{BASE}/api/agents/{TRIAGE}/execute", headers=H,
            json={"message": f"NEW SUPPORT TICKET [BURST-{i:02d}]\n{msg}"},
        )
    except httpx.HTTPError as e:
        # Under heavy concurrency a single inline execute can exceed the client
        # timeout — record it, don't abort the whole burst.
        return {"i": i, "path": "TIMEOUT", "final": "error",
                "wait": round(time.monotonic() - t0, 1)}
    if r.status_code == 202:
        body = r.json()
        ticket = body.get("ticket_id")
        poll = body.get("poll_url")
        # Poll the overflow queue until the drainer completes it.
        for _ in range(60):
            await asyncio.sleep(2)
            pr = await client.get(f"{BASE}{poll}", headers=H)
            pj = pr.json()
            if pj.get("status") in ("completed", "failed"):
                return {"i": i, "path": "QUEUED", "final": pj.get("status"),
                        "wait": round(time.monotonic() - t0, 1)}
        return {"i": i, "path": "QUEUED", "final": "timeout", "wait": round(time.monotonic() - t0, 1)}
    if r.status_code == 200:
        return {"i": i, "path": "INLINE", "final": "completed", "wait": round(time.monotonic() - t0, 1)}
    return {"i": i, "path": f"HTTP{r.status_code}", "final": "error", "wait": round(time.monotonic() - t0, 1)}


async def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 14
    print(f"Firing {n} concurrent tickets at triage {TRIAGE[:8]}… (base 3 RPM, cap 9)\n")
    async with httpx.AsyncClient(timeout=120.0) as client:
        results = await asyncio.gather(*[fire_one(client, i) for i in range(n)])
        inline = sum(1 for r in results if r["path"] == "INLINE")
        queued = sum(1 for r in results if r["path"] == "QUEUED")
        print(f"RESULT: {inline} ran inline, {queued} were queued+drained, "
              f"{n - inline - queued} other\n")
        # Real autoscaler state
        sc = (await client.get(f"{BASE}/api/agents/{TRIAGE}/scaling", headers=H)).json()
        ev = (await client.get(f"{BASE}/api/agents/{TRIAGE}/scaling/events?limit=10", headers=H)).json()
        q = (await client.get(f"{BASE}/api/agents/{TRIAGE}/queue", headers=H)).json()
        print(f"effective_rpm now: {sc.get('effective_rpm')} (base {sc.get('base_rpm')}), "
              f"scaling_active: {sc.get('scaling_active')}, queue_depth: {q.get('queue_depth')}")
        print(f"scaling events ({ev.get('total')}):")
        for e in ev.get("events", [])[:6]:
            print(f"  {e['event_type']}: {e['previous_capacity']}→{e['new_capacity']} "
                  f"@ util {e.get('trigger_utilization')}")


if __name__ == "__main__":
    asyncio.run(main())
