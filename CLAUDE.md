# Silver Bullet — CLAUDE.md

## What is Silver Bullet?

Silver Bullet is a demo project that proves Bonito's multi-agent framework for Bulletproof, an MSP with 300+ client sites. It simulates Tier 1 IT support ticket handling: incoming tickets are triaged by an AI router agent, delegated to specialist agents via `invoke_agent`, resolved using KB search, and documented via Halo ITSM API calls.

**Bonito project:** `ef7c1fd9-0852-401f-8f7e-1e2330139190`
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
└── setup/provision.py      # Creates agents/KBs on Bonito
```
