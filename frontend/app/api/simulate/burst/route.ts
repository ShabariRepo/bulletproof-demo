import { generateRandomTicket, type SimTicket } from "@/lib/sim-tickets";
import { appendLiveRun, type LiveRun } from "@/lib/live-runs";

export const dynamic = "force-dynamic";
export const maxDuration = 240;

// ---------------------------------------------------------------------------
// Burst mode — fire N concurrent /execute calls at the triage agent to drive
// (and visualize) the Agent HPA autoscaler + overflow queue.
//
// Parsing/routing helpers are PORTED from app/api/simulate/route.ts (the
// single-ticket route). The triage agent wraps its answer in a ```json fence
// and nests the specialist's own ```json reply inside `specialist_response`,
// so we strip the OUTERMOST fence by line.
// ---------------------------------------------------------------------------
function parseJson(text: string): Record<string, any> {
  let cleaned = (text ?? "").trim();
  if (cleaned.startsWith("```")) {
    const newline = cleaned.indexOf("\n");
    if (newline !== -1) {
      cleaned = cleaned.slice(newline + 1);
    }
    const lastFence = cleaned.lastIndexOf("```");
    if (lastFence !== -1) {
      cleaned = cleaned.slice(0, lastFence);
    }
    cleaned = cleaned.trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    // fall through to outermost-brace fallback
  }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // give up
    }
  }
  return {};
}

const CLASSIFICATION_MAP: Record<string, string> = {
  password_account: "password-specialist",
  connectivity_vpn: "connectivity-specialist",
  software_provisioning: "software-specialist",
  hardware_general: "general-support"
};

function isNullish(value: unknown): boolean {
  return value === null || value === undefined || value === "null" || value === "None" || value === "";
}

// Mirror the routing precedence from the single-ticket route (escalation-first).
function determineRouting(parsed: Record<string, any>): { routing: string; isEscalation: boolean } {
  const action = parsed.action ?? "";
  const specialist = parsed.specialist ?? "";
  const specialistResponse = parsed.specialist_response;
  const classification = parsed.classification ?? "";

  let routing = "unknown";

  if (action === "escalate") {
    routing = "ESCALATION";
  } else if (!isNullish(specialistResponse)) {
    routing = CLASSIFICATION_MAP[classification] ?? (specialist || classification);
  } else if (specialist && specialist !== "null" && specialist !== "None") {
    routing = specialist;
  } else if (action === "delegate") {
    routing = CLASSIFICATION_MAP[classification] ?? classification;
  }

  return { routing, isEscalation: routing === "ESCALATION" };
}

function extractResolution(parsed: Record<string, any>, fallbackContent: string): string {
  const sr = parsed.specialist_response;
  if (sr && typeof sr === "object") {
    if (typeof sr.resolution === "string" && sr.resolution.trim()) return sr.resolution.trim();
    if (Array.isArray(sr.steps_taken) && sr.steps_taken.length) return sr.steps_taken.join("\n");
  }
  if (typeof sr === "string" && sr.trim() && !isNullish(sr)) {
    const inner = parseJson(sr);
    if (inner.resolution) return String(inner.resolution).trim();
    return sr.trim();
  }
  if (parsed.escalation_reason && typeof parsed.escalation_reason === "string") {
    return `Escalated: ${parsed.escalation_reason}`;
  }
  return (fallbackContent ?? "").trim();
}

function looksResolved(resolution: string): boolean {
  if (!resolution.trim()) return false;
  const lower = resolution.toLowerCase();
  if (lower.includes("tool error") || lower.includes("failed to delegate") || lower.includes("error executing")) {
    return false;
  }
  return true;
}

function pause(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

type ExecOutcome = {
  data: any;
  path: "inline" | "queued";
  elapsed: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawCount = Number.parseInt(searchParams.get("count") ?? "12", 10);
  const count = Number.isFinite(rawCount) ? Math.max(1, Math.min(30, rawCount)) : 12;

  const token = process.env.BONITO_API_TOKEN ?? "";
  const baseUrl = (process.env.BONITO_URL ?? "https://api.getbonito.com").replace(/\/$/, "");
  const triageId = process.env.TRIAGE_ROUTER_ID ?? "";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (type: string, payload: Record<string, any>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`));
        } catch {
          // controller may be closed
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      if (!token || !token.startsWith("bp-")) {
        send("error", {
          message:
            "Burst mode needs the server-side Bonito token. Add BONITO_API_TOKEN (a scoped bp- token), BONITO_URL, and TRIAGE_ROUTER_ID to frontend/.env.local and restart the dev server."
        });
        close();
        return;
      }
      if (!triageId) {
        send("error", { message: "TRIAGE_ROUTER_ID is not configured in .env.local." });
        close();
        return;
      }

      const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      // ----- Autoscaler state poller (runs alongside the burst) --------------
      let pollerActive = true;
      let peakRpm = 0;
      const seenEventKeys = new Set<string>();
      const scaleEvents: { type: string; from: number; to: number; util: number; at: string }[] = [];

      async function pollAutoscaler() {
        while (pollerActive) {
          try {
            const [scalingResp, eventsResp, queueResp] = await Promise.allSettled([
              fetch(`${baseUrl}/api/agents/${triageId}/scaling`, { headers: authHeaders }),
              fetch(`${baseUrl}/api/agents/${triageId}/scaling/events?limit=10`, { headers: authHeaders }),
              fetch(`${baseUrl}/api/agents/${triageId}/queue`, { headers: authHeaders })
            ]);

            let baseRpm = 0;
            let effectiveRpm = 0;
            let scalingActive = false;
            let utilization = 0;
            let queueDepth = 0;

            if (scalingResp.status === "fulfilled" && scalingResp.value.ok) {
              const s = await scalingResp.value.json().catch(() => ({}));
              baseRpm = Number(s.base_rpm) || 0;
              effectiveRpm = Number(s.effective_rpm) || 0;
              scalingActive = Boolean(s.scaling_active);
              utilization = Number(s.utilization) || 0;
              if (effectiveRpm > peakRpm) peakRpm = effectiveRpm;
            }

            if (queueResp.status === "fulfilled" && queueResp.value.ok) {
              const q = await queueResp.value.json().catch(() => ({}));
              queueDepth = Number(q.queue_depth) || 0;
            }

            let freshEvents: typeof scaleEvents = [];
            if (eventsResp.status === "fulfilled" && eventsResp.value.ok) {
              const e = await eventsResp.value.json().catch(() => ({}));
              const events = Array.isArray(e.events) ? e.events : [];
              for (const ev of events) {
                const key = `${ev.event_type}:${ev.previous_capacity}:${ev.new_capacity}:${ev.created_at}`;
                if (seenEventKeys.has(key)) continue;
                seenEventKeys.add(key);
                const mapped = {
                  type: String(ev.event_type ?? ""),
                  from: Number(ev.previous_capacity) || 0,
                  to: Number(ev.new_capacity) || 0,
                  util: Number(ev.trigger_utilization) || 0,
                  at: String(ev.created_at ?? "")
                };
                scaleEvents.push(mapped);
                freshEvents.push(mapped);
              }
            }

            send("autoscaler", {
              baseRpm,
              effectiveRpm,
              scalingActive,
              utilization,
              queueDepth,
              events: freshEvents
            });
          } catch {
            // transient poll failure — ignore, try again next tick
          }
          await pause(1500);
        }
      }

      // ----- One ticket's execute lifecycle (inline OR queued→poll) ----------
      async function runTicket(idx: number, ticket: SimTicket): Promise<ExecOutcome | null> {
        const message = `NEW SUPPORT TICKET [${ticket.id}]\nSubject: ${ticket.subject}\n\n${ticket.body}`;
        const started = Date.now();

        const abort = new AbortController();
        const timeout = setTimeout(() => abort.abort(), 150_000);

        try {
          const resp = await fetch(`${baseUrl}/api/agents/${triageId}/execute`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({ message }),
            signal: abort.signal
          });

          if (!resp.ok) {
            const text = await resp.text().catch(() => "");
            throw new Error(`HTTP ${resp.status} ${text.slice(0, 120)}`);
          }

          const body = await resp.json();

          // 202 queued → poll the poll_url until completed/failed.
          if (resp.status === 202 || body?.status === "queued") {
            send("ticket_queued", { idx, position: Number(body?.position) || 0 });
            const pollUrl: string = body?.poll_url
              ? `${baseUrl}${body.poll_url.startsWith("/") ? "" : "/"}${body.poll_url}`
              : `${baseUrl}/api/agents/${triageId}/queue/${body?.ticket_id}`;

            // Poll until terminal (timeout governed by the same abort/150s).
            while (!abort.signal.aborted) {
              await pause(2000);
              const pollResp = await fetch(pollUrl, { headers: authHeaders, signal: abort.signal });
              if (!pollResp.ok) continue;
              const pollBody = await pollResp.json().catch(() => ({}));
              const status = pollBody?.status;
              if (status === "completed") {
                return { data: pollBody.result ?? {}, path: "queued", elapsed: (Date.now() - started) / 1000 };
              }
              if (status === "failed") {
                throw new Error(`queued ticket failed: ${pollBody?.error ?? "unknown"}`);
              }
              // else still "queued" — keep polling
            }
            throw new Error("queued ticket timed out");
          }

          // 200 inline
          return { data: body, path: "inline", elapsed: (Date.now() - started) / 1000 };
        } finally {
          clearTimeout(timeout);
        }
      }

      // ----- Drive the burst -------------------------------------------------
      const pollerPromise = pollAutoscaler();

      send("burst_start", { count });

      let inline = 0;
      let queued = 0;
      let dropped = 0;
      let totalCost = 0;
      let totalTokens = 0;

      const ticketPromises = Array.from({ length: count }, (_, idx) => {
        const ticket = generateRandomTicket();
        // Stagger fire slightly so the swarm lights up in sequence (not a
        // visual jump) — still effectively concurrent against the agent.
        return (async () => {
          await pause(idx * 120);
          send("ticket_fired", { idx, ticketLabel: ticket.id, category: ticket.category });

          try {
            const outcome = await runTicket(idx, ticket);
            if (!outcome) {
              dropped += 1;
              send("ticket_done", {
                idx,
                classification: "error",
                severity: "unknown",
                routing: "unknown",
                isEscalation: false,
                triageCorrect: false,
                path: "inline",
                tokens: 0,
                cost: 0,
                elapsed: 0,
                error: true
              });
              return;
            }

            const data = outcome.data ?? {};
            const content: string = data?.content ?? data?.response ?? "";
            const model: string = data?.model_used ?? "unknown";
            const tokens: number = typeof data?.tokens === "number" ? data.tokens : 0;
            const cost: number =
              typeof data?.cost === "number" ? data.cost : Number.parseFloat(data?.cost ?? "0") || 0;

            const parsed = parseJson(content);
            const classification: string = parsed.classification ?? "unknown";
            const severity: string = parsed.severity ?? "unknown";
            const confidence: number =
              typeof parsed.confidence === "number" ? parsed.confidence : Number.parseFloat(parsed.confidence ?? "0") || 0;
            const { routing, isEscalation } = determineRouting(parsed);
            const resolution = extractResolution(parsed, content);
            const triageCorrect = routing === ticket.expectedRouting;
            const resolved = looksResolved(resolution);

            if (outcome.path === "inline") inline += 1;
            else queued += 1;
            totalCost += cost;
            totalTokens += tokens;

            // Persist — these are REAL runs. Prefix the label so they read as
            // burst runs on the dashboard/calendar.
            const run: LiveRun = {
              runId: `burst-${ticket.id}-${Date.now()}-${idx}`,
              timestamp: new Date().toISOString(),
              ticketLabel: `BURST · ${ticket.id}`,
              subject: ticket.subject,
              category: ticket.category,
              classification,
              severity,
              confidence,
              routing,
              expectedRouting: ticket.expectedRouting,
              triageCorrect,
              resolved,
              model,
              tokens,
              cost,
              elapsedSeconds: Math.round(outcome.elapsed * 10) / 10
            };
            appendLiveRun(run);

            send("ticket_done", {
              idx,
              classification,
              severity,
              routing,
              isEscalation,
              triageCorrect,
              path: outcome.path,
              tokens,
              cost,
              elapsed: Math.round(outcome.elapsed * 10) / 10
            });
          } catch (err) {
            // One failure NEVER aborts the burst.
            dropped += 1;
            send("ticket_done", {
              idx,
              classification: "error",
              severity: "unknown",
              routing: "unknown",
              isEscalation: false,
              triageCorrect: false,
              path: "inline",
              tokens: 0,
              cost: 0,
              elapsed: 0,
              error: true
            });
          }
        })();
      });

      await Promise.allSettled(ticketPromises);

      // Let the poller emit one final state snapshot (queue drains, scale-down).
      await pause(1800);
      pollerActive = false;
      await pollerPromise.catch(() => undefined);

      send("burst_complete", {
        inline,
        queued,
        dropped,
        peakRpm,
        scaleEvents,
        totalCost: Math.round(totalCost * 1e6) / 1e6,
        totalTokens
      });
      close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
