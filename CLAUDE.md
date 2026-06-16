# Silver Bullet — CLAUDE.md

## What is Silver Bullet?

Silver Bullet is a demo project that proves Bonito's multi-agent framework for Bulletproof, an MSP with 300+ client sites. It simulates Tier 1 IT support ticket handling: incoming tickets are triaged by an AI router agent, delegated to specialist agents via `invoke_agent`, resolved using KB search, and prepared for Halo ITSM write-back by the frontend/API layer.

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
cp .env.example .env  # Edit with scoped BONITO_API_TOKEN=bp-...
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
│   ├── evaluation.py       # Honest triage + resolution-quality assertions
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

## Recent Changes (2026-06-15)

- **Honest metrics:** `results.json` now tracks triage/escalation correctness separately from resolution-quality correctness.
- **Saved run status:** Old saved run is 10/10 triage but 4/10 resolution quality. Regenerate after provisioning with the fixed prompts.
- **Auth:** `src/bonito_client.py` requires a scoped `BONITO_API_TOKEN=bp-...`; full account email/password login is intentionally rejected.
- **Halo:** Prod agents no longer call `http_request` to `localhost`. Specialists draft `halo_work_note`; frontend/API writes to Halo.
- **Model config:** `bonito.yaml` and `setup/provision.py` now agree that all five agents use `gpt-4o-mini`.
- **Quality fixes:** Prompts now force Apex/ZPA over user-claimed AnyConnect, GamingCo Dropbox denial + SharePoint alternative, Pinnacle warranty/dispatch guidance, and Sentinel SOC/client-contact escalation.

## Known Issues / Blockers

- **Prod verification blocked:** `.env` currently lacks `BONITO_API_TOKEN`, so `python -m setup.provision` and `python -m src.run_demo` fail before network calls.
- **Saved results stale:** `results.json` still contains the old run responses and must be regenerated from Bonito prod once a scoped token is available.
- **This sandbox:** cannot write `.git/index.lock`, so commits must be made outside the sandbox.
