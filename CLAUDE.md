# Silver Bullet — CLAUDE.md

## What is Silver Bullet?

Silver Bullet is a demo project that proves Bonito's multi-agent framework for Bulletproof, an MSP with 300+ client sites. It simulates Tier 1 IT support ticket handling: incoming tickets are triaged by an AI router agent, delegated to specialist agents via `invoke_agent`, resolved using KB search, and documented via Halo ITSM API calls.

**Bonito project:** `b0bcd4b2-c667-4b98-8edb-48924d364e74`
**Target audience:** Bulletproof dev team (CTO: Christopher Simm)

## Architecture

```
Ticket → Triage Router (gpt-4o-mini)
           ├── invoke_agent → Password Specialist (KB: password-procedures)
           ├── invoke_agent → Connectivity Specialist (KB: vpn-procedures)
           ├── invoke_agent → Software Specialist (KB: approved-software)
           ├── invoke_agent → General Support (KB: client-directory)
           └── ESCALATE → Human (no delegation)
```

All agents run on Bonito prod (api.getbonito.com). No local LLM calls.

## Key Commands

```bash
# Setup
cp .env.example .env  # Edit with Bonito credentials
pip install -r requirements.txt
python -m setup.provision  # Creates agents, KBs, connections

# Run demo
python -m src.run_demo                    # All 10 tickets
python -m src.run_demo --ticket BP-004    # Single ticket
python -m src.run_demo --halo             # With Halo mock server

# Sentinel alert test
python -m src.sentinel_simulator

# Halo mock server (standalone)
python -m src.halo_mock
```

## Project Structure

```
bulletproof-demo/
├── bonito.yaml             # Declarative agent config
├── agents/                 # System prompts (5 agents)
├── knowledge-bases/        # Mock KB documents (5 files)
├── tickets/demo-tickets.yaml  # 10 test scenarios
├── src/
│   ├── run_demo.py         # Entry point
│   ├── bonito_client.py    # Bonito API client
│   ├── ticket_runner.py    # Ticket → agent pipeline
│   ├── report.py           # Rich summary report
│   ├── sentinel_simulator.py
│   └── halo_mock.py        # Halo ITSM mock server
├── setup/
│   ├── provision.py        # Creates agents/KBs on Bonito
│   └── fix_kbs.py          # Delete failed docs, re-upload, verify chunks
└── PROGRESS.md             # Demo status and known issues
```

## Provisioned Resources

- **Project:** `b0bcd4b2-c667-4b98-8edb-48924d364e74`
- **KBs:** client-directory=`078db9fe`, password-procedures=`13058a10`, vpn-procedures=`d6fa71ff`, approved-software=`2ee82db9`, escalation-matrix=`84ca08fc`
- **Agents:** triage-router=`98c6d000`, password-specialist=`6638b048`, connectivity-specialist=`c11dd9b7`, software-specialist=`fa814ced`, general-support=`253d8fe7`

## Recent Changes (2026-05-25)

- **KB ingestion fixes:** All 5 KBs populated (3-5 chunks each). Fixed by resolving pgvector dimension mismatch (vector(768) → vector(1024)) and stuck "processing" status (missing db.rollback) on the Bonito backend side.
- **Agent model switch:** All 5 agents now use `gpt-4o-mini`. Password specialist was on Bedrock Sonnet (30s+ latency due to cross-region routing) — switched to gpt-4o-mini for speed.
- **Connectivity specialist prompt:** Added "trust client-directory over user's VPN claim" instruction to handle cases where users name the wrong VPN product.
- **fix_kbs.py script:** New setup script that deletes failed docs, re-uploads all KB content, waits for processing, verifies chunk counts, and updates all 5 agents' KB references.
- **bonito_client.py:** Added `list_documents()` and `delete_document()` methods for KB cleanup.
- **Demo results:** 10/10 routing accuracy, $0.011 total cost, 30.1s avg response time.

## Known Issues

- **BP-004:** Connectivity specialist gives AnyConnect steps for Apex Financial, but Apex uses Zscaler ZPA per client-directory KB. Prompt update didn't fully fix it — may need two-step search.
- **BP-007:** invoke_agent to software specialist hits tool errors (likely http_request to localhost:8090 Halo mock not running), burns 15K tokens retrying, then escalates instead of denying Dropbox request.
