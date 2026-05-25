# Silver Bullet — Bulletproof Tier 1 Demo Progress

## Status: Working (10/10 routing, 2 response quality issues)

### Demo Results (2026-05-25)
- **Routing accuracy:** 10/10 (100%)
- **Total cost:** $0.011
- **Avg response time:** 30.1s
- **Model:** gpt-4o-mini for all 5 agents

### Known Issues to Fix

**BP-004: Connectivity specialist ignores client-directory VPN type**
- User says "Cisco AnyConnect" but Apex Financial uses Zscaler ZPA per client-directory KB
- Prompt was updated to say "trust client-directory over user's claim" but agent still went with AnyConnect
- Fix: May need stronger prompt language or a two-step search (search client-directory first, then search vpn-procedures for the correct VPN type)

**BP-007: invoke_agent to software specialist fails silently**
- Triage router tries to delegate to software specialist but gets tool errors
- Burns 15K tokens retrying, then escalates with "Unable to delegate due to tool errors"
- Never actually denies the Dropbox request or suggests SharePoint alternative
- Root cause: likely the http_request tool trying to hit localhost:8090 (Halo mock not running) causing cascading errors
- Fix: investigate the software specialist's execution logs, possibly make Halo ticket creation optional in the prompt

### What Was Fixed (2026-05-24 — 2026-05-25)

1. **KB delete 500** — pgvector OID 24578 error. Fixed with raw SQL deletes instead of ORM cascade (PRs #43040-#43042)
2. **Embedding timeout** — Bedrock Titan V2 timing out at 30s. Increased to 90s (PR #43043)
3. **GCS auth wasting 43s on Railway** — Fast-fail when no GCS credentials configured (PR #43043)
4. **KB vector dimension mismatch** — Column was vector(768), Titan V2 returns 1024-dim. Migration 041 fixes column + backfills KBs (PR #43044-#43045)
5. **Stuck "processing" status** — Added db.rollback() before error handler status update (PR #43045)
6. **Alembic multiple heads** — discover_logs migration branched from same parent as 041. Merge migration 042 (PR #43046)
7. **Intermittent greenlet_spawn 500** — Moved pgvector codec registration from connect to checkout event (PR #43047)
8. **Agent model IDs** — Switched password specialist from Bedrock Sonnet (slow) to gpt-4o-mini
9. **Schema default** — embedding_dimensions default changed from 768 to 1024

### Provisioned Resources
- **Project:** b0bcd4b2-c667-4b98-8edb-48924d364e74
- **KBs:** client-directory=078db9fe, password-procedures=13058a10, vpn-procedures=d6fa71ff, approved-software=2ee82db9, escalation-matrix=84ca08fc
- **Agents:** triage-router=98c6d000, password-specialist=6638b048, connectivity-specialist=c11dd9b7, software-specialist=fa814ced, general-support=253d8fe7
