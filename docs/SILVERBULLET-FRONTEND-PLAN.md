# Silver Bullet — Frontend Plan + Azure Integration

**Audience:** Internal (Shabari + Chris Simm, CTO, Bulletproof)
**Status:** Local implementation in progress — Phase 0 complete, Phase 1-4 demo paths implemented with mock defaults
**Last updated:** 2026-06-15
**Backing repo:** `~/Desktop/code/bulletproof-demo` (this repo)
**Backing platform:** Bonito (`api.getbonito.com`)

---

## TL;DR

We have a CLI demo of Silver Bullet (5 agents, 5 KBs, Halo mock, Sentinel simulator, 10 test tickets) and a local frontend. The old "10/10 routing accuracy" headline is now split into two metrics: triage/escalation correctness and resolution-quality correctness. This plan defines the 4-phase build to connect the demo to Bulletproof's real Azure tenant, real Halo ITSM, and real N-able events.

**Target outcome:** A web app Chris can hit at `silverbullet.demo.getbonito.com` (or similar) that shows tickets flowing in, agents triaging them, KB articles being cited, and tickets being closed back to Halo — using **his actual stack** as much as we can get access to.

## Implementation status as of 2026-06-15

The frontend now exists under `frontend/` and builds locally. It runs in mock mode by default so it can be shown without Bulletproof tenant access.

| Phase | Local status | Notes |
|---|---|---|
| 0 — Mocked frontend | Implemented | Dashboard, ticket detail, trace, KB explorer, settings, local build. |
| 1 — Bonito live runs | Implemented as UI + API path | Ticket pages stream local SSE events and call `/api/bonito/run`; live Bonito is attempted when credentials are saved. |
| 2 — Halo | Implemented as UI + API path | `/api/halo/tickets` and `/api/halo/actions`; defaults to mock, attempts live/mock-server write-back when configured. |
| 3 — N-able + Sentinel | Implemented as webhook mappings | `/api/n-able-webhook` and `/api/sentinel-webhook` normalize alerts into Silver Bullet tickets. |
| 4 — Azure provider | Implemented as config validation | Settings captures Azure fields and `/api/azure/provider` returns readiness + `bonito.yaml` snippet. Real switch remains blocked on Bulletproof Azure access. |

Remaining external blockers:
- Scoped Bonito `bp-*` token for provisioning and live agent execution.
- Halo sandbox tenant/client credentials, or running `src/halo_mock.py` locally.
- Real N-able and Sentinel webhook registration in Bulletproof environments.
- Bulletproof Azure subscription/provider setup.

---

## Where we are today

### What exists (works)

| Capability | Where it lives |
|---|---|
| Triage router agent (gpt-4o-mini) routes incoming tickets to specialists | `agents/triage-router/` |
| 4 specialist agents (password, connectivity, software, general support) each with a KB | `agents/*/` |
| 5 knowledge bases (client-directory, password-procedures, vpn-procedures, approved-software, escalation-matrix) | `knowledge-bases/*.md` |
| Halo ITSM API mock server | `src/halo_mock.py` |
| Sentinel alert simulator | `src/sentinel_simulator.py` |
| 10 demo tickets covering BP-001 through BP-010 | `tickets/demo-tickets.yaml` |
| End-to-end CLI runner | `src/run_demo.py` |
| Provisioning script (deploys agents + KBs to Bonito prod) | `setup/provision.py` |

**Saved run status (annotated 2026-06-15):**
- Triage/escalation correctness: 10/10 (100%)
- Resolution-quality correctness: 4/10 (40%) on the old saved run
- Total cost across 10 tickets: $0.011
- Avg response time: 30.1s
- Saved run still contains pre-fix failures including BP-004, BP-007, and BP-008. Regenerate after provisioning with a scoped `bp-*` token.

### What's missing

- **No deployed URL yet.** The frontend exists locally but has not been deployed to Vercel.
- **No verified live integrations yet.** Halo/N-able/Sentinel/Azure paths exist in UI/API but need tenant credentials and webhook registration.
- **No regenerated passing prod run yet.** The old saved run is honest 10/10 triage, 4/10 resolution quality.
- **No tenant isolation in the demo.** All runs hit one Bonito project. For a real Bulletproof deployment we'd want per-client tenant isolation.

---

## What Chris will actually want to see in a demo

Distilling from memory + the May 12 call notes:

1. **A ticket comes in** (from Halo or simulated as a Sentinel alert)
2. **The router decides** where it should go — visible decision tree, not a black box
3. **A specialist agent picks it up**, cites the exact KB articles it consulted, drafts a response or resolution
4. **If high-risk** (password reset for a privileged account, software install request, etc.) → routes to **approval queue**, human approves/denies
5. **Ticket gets closed in Halo** with the AI-generated resolution as the work-note
6. **A dashboard shows ROI**: tickets resolved, avg handle time, KB hit rate, cost per ticket, deflection rate (tickets resolved without human touch). This is the **"ROI for the ELT"** angle Chris explicitly asked about.

The frontend should make these six things obvious and clickable.

---

## Architecture

```
┌────────────────────────┐
│  Sources of tickets    │
│  - Halo ITSM webhook   │
│  - N-able event hook   │
│  - Sentinel playbook   │ ◄── all push tickets in
│  - Manual test form    │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  Silver Bullet frontend│ ◄── Next.js app
│  (silverbullet.demo)   │     - Dashboard
└──────────┬─────────────┘     - Ticket detail
           │                   - Agent trace viewer
           │                   - KB explorer
           ▼                   - Settings / connections
┌────────────────────────┐
│  Bonito platform       │ ◄── existing production
│  api.getbonito.com     │     - Triage router agent
│  - /api/agents/*       │     - Specialist agents
│  - /api/breadcrumbs    │     - KB search (RAG)
│  - /v1/chat/...        │     - Approval queue
│  - SSE streams         │     - Audit log
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  Customer's real cloud │
│  - Azure OpenAI (their │ ◄── via `bonito providers add azure`
│    own deployments)    │
│  - Halo ITSM tenant    │ ◄── via Halo API key
│  - N-able tenant       │ ◄── via N-able API token
│  - Sentinel workspace  │ ◄── via Log Analytics Reader role
└────────────────────────┘
```

**Key insight:** Bonito is already the agent runtime and the ticket-processing engine. The frontend is a *thin* presentation layer over Bonito's existing APIs — not a re-implementation.

---

## Phase plan

### Phase 0 — Demo-only, mocked data (4-5 days)

**Goal:** A clickable demo Chris can play with, no real integrations needed. Sendable as a Loom + URL.

- Next.js 14 app scaffolded under `frontend/` in this repo
- Tailwind + shadcn/ui to match Bonito's look (purple `#7c3aed` primary)
- Hardcoded ticket list seeded from `tickets/demo-tickets.yaml`
- Dashboard: counts, KPIs, cost summary (pulled from `results.json` after a run)
- Ticket detail page:
  - Original ticket text
  - Routing decision (which specialist was picked + why)
  - Agent trace: tool calls, KB queries, draft responses
  - Halo close-out preview (the work-note that *would* be written)
- KB explorer: browse the 5 KBs we already have, see chunked content
- Settings page: shows which Azure / Halo / N-able connections *would* be configured (stubbed)
- Deploy to Vercel under `silverbullet.demo.getbonito.com`

**Deliverable:** URL + screenshare. No real Bulletproof data flows yet.

---

### Phase 1 — Live agent runs through Bonito (3-4 days)

**Goal:** Click "Run ticket" in the UI → it actually fires a Bonito agent run via the API → you see Breadcrumbs-style live updates in the UI.

- Hit `POST /api/agents/{triage-router-id}/execute` with the ticket text
- Stream `GET /api/agents/{run-id}/events` (SSE) to render the agent trace live
- Pull KB citations from the response metadata
- Display total cost / latency / tokens used from the execute response
- Make the "Settings" page actually save Bonito API credentials in browser local storage (so it can multi-tenant later)

**Deliverable:** From the UI, you can run any of the 10 demo tickets through real Bonito agents and watch them think.

---

### Phase 2 — Real Halo ITSM integration (4-5 days)

**Goal:** Pull real tickets from Bulletproof's Halo instance, push resolutions back.

- Halo ITSM provides a REST API at `https://<tenant>.halopsa.com/api/`
- Required auth: client_id + client_secret OAuth2 (not API key — Halo dropped basic auth)
- Settings page: Halo connection form (tenant URL, client ID, client secret)
- Implement:
  - **Pull tickets:** `GET /api/Tickets?status=open` → import them
  - **Write resolution:** `POST /api/Actions` with `ticket_id`, `note`, `outcome=resolved`
  - **Webhook:** Halo can fire on new ticket → we expose a `POST /api/halo-webhook` endpoint that triggers a Bonito agent run
- Test in mock mode first using the existing `src/halo_mock.py`, then switch to real Halo

**Open question for Chris:**
- Will he give us API access to a sandbox Halo tenant, or do we keep using the mock and hand-write a screenshot scenario?

---

### Phase 3 — N-able + Sentinel event ingest (3-4 days)

**Goal:** When N-able alerts a misbehaving endpoint OR Sentinel fires a security playbook, a ticket auto-flows into Silver Bullet.

- **N-able** has a webhook API for alerts (configurable per device group). Form: HTTP POST with JSON body.
  - We expose `POST /api/n-able-webhook` → maps the alert to a Halo-shaped ticket → fires the triage agent
- **Microsoft Sentinel** uses Logic Apps / Automation Rules to push alerts to webhooks.
  - We expose `POST /api/sentinel-webhook` → same flow
- KB additions:
  - Add `n-able-runbooks` KB (procedures for common N-able alert types)
  - Keep `escalation-matrix` (already exists) for severity → human routing

**Open question for Chris:**
- Are Sentinel AND N-able both in Tier 1 scope, or has N-able replaced Sentinel? Memory says Sentinel was Tier 1; new info from 2026-06-09 says N-able + Halo. Need clarification at next call.

---

### Phase 4 — Customer's real Azure tenant (2-3 days, blocked on Bulletproof IT)

**Goal:** Bonito routes ALL Silver Bullet inference through Bulletproof's own Azure OpenAI subscription, not Bonito's managed key.

- Chris's team runs the Terraform module at `bonito-infra/azure` against a Bulletproof subscription
- (See `docs/TERRAFORM-AZURE-WINDOWS.md` in the main Bonito repo — that's the walkthrough we just wrote for Josh, applies here verbatim)
- Outputs feed into a `bonito providers add azure` call in Bulletproof's Bonito org
- Update Silver Bullet agents' `bonito.yaml` to set `provider: "azure"` instead of `provider: "openai"`
- Re-provision agents — they now run on Bulletproof's GPT-4o-mini deployment

**Why this matters to Chris:**
- Compliance: all data stays in Bulletproof's tenant
- Cost: they get their Microsoft enterprise agreement rate, not retail OpenAI
- Audit: all model calls show up in their Sentinel Log Analytics workspace

---

## Frontend tech stack (proposal)

| Layer | Pick | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Same as Bonito's frontend — easy code reuse |
| Styling | Tailwind CSS + shadcn/ui | Matches Bonito's design system |
| State | React Server Components + minimal client state | Server-driven, keeps it simple |
| Auth | NextAuth.js with Bonito's `bp-` token | Reuses Bonito identity |
| Hosting | Vercel | Same as Bonito frontend, zero config |
| Domain | `silverbullet.demo.getbonito.com` | Subdomain we already control |
| Visualizations | Recharts for KPIs, custom React for agent trace tree | Avoids heavy chart libs |
| Real-time | EventSource (SSE) against Bonito's `/breadcrumbs` SSE endpoint | Already built into platform |

**What we won't build:**
- A custom auth system (use Bonito's)
- A custom agent runtime (use Bonito's)
- A custom KB / RAG layer (use Bonito's)
- A custom approval queue (use Bonito's)
- A custom database (everything lives in Bonito; the frontend is stateless)

This is deliberately a *very thin* frontend — it's a window into Bonito with Silver Bullet branding.

---

## What Chris needs to provide (when he's ready)

For Phase 2:
- Sandbox Halo ITSM tenant URL + OAuth2 client_id/client_secret
- Read-only access to ~50 closed tickets we can use for KB training improvements

For Phase 3:
- N-able webhook configuration (he configures, gives us the URL pattern to register)
- Microsoft Sentinel Logic App configuration (same — he configures, gives us the URL)

For Phase 4:
- A non-production Bulletproof Azure subscription
- Owner role on it for Shabari, OR he runs the Terraform himself with our hand-holding (the Windows walkthrough makes this 25 minutes)

For Phase 0-1:
- **Nothing.** We can build this and demo it on our own.

---

## Demo script for the mid-June call

Suggested flow once Phase 1 is shipped:

1. Open the dashboard. Show 10 tickets, all "resolved" with timings + cost.
2. Click a ticket — show the agent trace, the KB chunks consulted, the draft Halo response.
3. Click "Run again live" — fire the triage agent in real time. Watch the SSE stream populate the trace view.
4. Show the KB explorer — chunks searchable in real time.
5. Show the settings page — pretend to plug in his Halo URL and Azure tenant. "When you're ready, we point at your stack, not ours."
6. ROI dashboard — show what 10x of these tickets a day would mean in cost savings.

Should land in ~15 minutes. Leaves time for Chris's team to ask questions.

---

## Known gotchas / things to confirm with Chris

1. **N-able vs Sentinel split.** Memory says Tier 1 is Sentinel. New info says N-able + Halo. Need to know which alerts flow through Silver Bullet first.
2. **Privileged escalation handling.** Some tickets (admin password resets, software installs to privileged groups) need human approval. Approval queue exists in Bonito; need Chris's policy on who has approval rights.
3. **Multi-tenant isolation.** If Bulletproof eventually resells this to their own clients (the "Scale model" from the May 12 call), each client tenant needs its own KBs and agents. We should design Phase 0 with this in mind, even if we don't ship it.
4. **Data residency.** Bulletproof works with regulated verticals (gaming, lottery, government). Some of their clients will require Canadian data residency. Confirm: which Azure region? We'd default to `canadacentral`.

---

## Open work items (post-plan-approval)

| # | Item | Phase | Effort |
|---|---|---|---|
| 1 | Scaffold Next.js app under `frontend/` | 0 | 2h |
| 2 | Port Bonito UI design system + Tailwind config | 0 | 2h |
| 3 | Build ticket list + detail pages from static data | 0 | 1d |
| 4 | KB explorer page | 0 | 4h |
| 5 | Deploy to Vercel under `silverbullet.demo.getbonito.com` | 0 | 1h |
| 6 | Bonito API client (typed) | 1 | 4h |
| 7 | Live agent execute + SSE viewer | 1 | 1d |
| 8 | Halo OAuth2 client | 2 | 4h |
| 9 | Halo webhook endpoint | 2 | 4h |
| 10 | Halo write-back integration | 2 | 1d |
| 11 | N-able webhook endpoint + alert→ticket mapping | 3 | 1d |
| 12 | Sentinel Logic App webhook + mapping | 3 | 1d |
| 13 | Azure provider connection guide doc | 4 | (already done: TERRAFORM-AZURE-WINDOWS.md) |
| 14 | Switch silver-bullet `bonito.yaml` to provider: azure | 4 | 2h |

**Total time-to-Phase-0-demo:** 4-5 working days.
**Total time-to-Phase-1 (live Bonito agents in UI):** 7-9 days.
**Total time-to-real-stack:** depends entirely on Bulletproof's IT timeline.

---

## What this plan does NOT cover (out of scope, for now)

- White-label branding for Bulletproof's clients (the "Scale model" — separate plan)
- The 17-22 other use cases Chris mentioned (this is the Tier 1 support use case only)
- A formal ROI calculation framework (we'll show cost-per-ticket; deeper ROI modeling is a separate piece)
- Compliance documentation for SOC-2 / HIPAA / GDPR (Bonito's existing compliance docs cover this — we don't redo them per customer)

---

## Next action

Review this plan with Shabari, decide whether to start Phase 0 this week or wait for the mid-June call to align with Chris on integration access. Phase 0 is doable independently and gives us a sendable demo URL within a week regardless of what Chris green-lights for integrations.
