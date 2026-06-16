import { generateRandomTicket, type SimCategory, type SimTicket } from "@/lib/sim-tickets";
import { appendLiveRun, type LiveRun } from "@/lib/live-runs";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// ---------------------------------------------------------------------------
// JSON parsing — ported verbatim from src/bonito_client.py `parse_json`.
//
// The triage agent wraps its answer in a ```json fence AND embeds the
// specialist's own ```json-fenced reply inside the `specialist_response`
// string. A non-greedy fence regex stops at the FIRST closing ``` (the nested
// one), corrupting the parse. So strip the OUTERMOST fence by line (drop the
// first ``` line + cut from the LAST ```), leaving any nested fence intact
// inside the string value — backticks are legal inside JSON strings.
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

// KB each specialist grounds in (real association — these KBs are attached to
// those agents on the Bonito project).
const CLASSIFICATION_KB: Record<string, string> = {
  password_account: "Password Procedures",
  connectivity_vpn: "VPN Procedures",
  software_provisioning: "Approved Software",
  hardware_general: "Client Directory",
  escalation: "Escalation Matrix",
  security_alert: "Escalation Matrix"
};

const SPECIALIST_LABELS: Record<string, string> = {
  "password-specialist": "Password & Account Specialist",
  "connectivity-specialist": "Connectivity & VPN Specialist",
  "software-specialist": "Software & Provisioning Specialist",
  "general-support": "General Support",
  ESCALATION: "Human escalation"
};

function isNullish(value: unknown): boolean {
  return value === null || value === undefined || value === "null" || value === "None" || value === "";
}

// Mirror the routing precedence from the fixed src/ticket_runner.py.
function determineRouting(parsed: Record<string, any>): { routing: string; isEscalation: boolean } {
  const action = parsed.action ?? "";
  const specialist = parsed.specialist ?? "";
  const specialistResponse = parsed.specialist_response;
  const classification = parsed.classification ?? "";

  let routing = "unknown";

  // (1) Escalation wins unambiguously — check action FIRST.
  if (action === "escalate") {
    routing = "ESCALATION";
  }
  // (2) A populated specialist_response means delegation happened.
  else if (!isNullish(specialistResponse)) {
    routing = CLASSIFICATION_MAP[classification] ?? (specialist || classification);
  }
  // (3) A specialist name present without a response.
  else if (specialist && specialist !== "null" && specialist !== "None") {
    routing = specialist;
  }
  // (4) Delegate action.
  else if (action === "delegate") {
    routing = CLASSIFICATION_MAP[classification] ?? classification;
  }

  return { routing, isEscalation: routing === "ESCALATION" };
}

// Pull a human-readable resolution from the (possibly nested) specialist reply.
function extractResolution(parsed: Record<string, any>, fallbackContent: string): string {
  const sr = parsed.specialist_response;
  if (sr && typeof sr === "object") {
    if (typeof sr.resolution === "string" && sr.resolution.trim()) return sr.resolution.trim();
    if (Array.isArray(sr.steps_taken) && sr.steps_taken.length) return sr.steps_taken.join("\n");
    if (Array.isArray(sr.steps) && sr.steps.length) return sr.steps.join("\n");
  }
  if (typeof sr === "string" && sr.trim() && !isNullish(sr)) {
    // The specialist_response may itself be a ```json-fenced object.
    const inner = parseJson(sr);
    if (inner.resolution) return String(inner.resolution).trim();
    if (Array.isArray(inner.steps_taken) && inner.steps_taken.length) return inner.steps_taken.join("\n");
    return sr.trim();
  }
  if (parsed.escalation_reason && typeof parsed.escalation_reason === "string") {
    return `Escalated: ${parsed.escalation_reason}`;
  }
  if (parsed.reasoning && typeof parsed.reasoning === "string") return parsed.reasoning.trim();
  return (fallbackContent ?? "").trim();
}

function shortSnippet(parsed: Record<string, any>): string {
  const sr = parsed.specialist_response;
  if (sr && typeof sr === "object") {
    if (sr.resolution) return String(sr.resolution).slice(0, 280);
  }
  if (typeof sr === "string" && !isNullish(sr)) {
    const inner = parseJson(sr);
    if (inner.resolution) return String(inner.resolution).slice(0, 280);
    return sr.slice(0, 280);
  }
  return "";
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category") as SimCategory | null;

  const token = process.env.BONITO_API_TOKEN ?? "";
  const baseUrl = (process.env.BONITO_URL ?? "https://api.getbonito.com").replace(/\/$/, "");
  const triageId = process.env.TRIAGE_ROUTER_ID ?? "";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (stage: string, payload: Record<string, any>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ stage, ...payload })}\n\n`));
      };

      // Cosmetic pause between post-result reveal stages (real data, paced UI).
      const REVEAL_PAUSE = 700;

      try {
        if (!token || !token.startsWith("bp-")) {
          send("error", {
            message:
              "Live mode needs the server-side Bonito token. Add BONITO_API_TOKEN (a scoped bp- token), BONITO_URL, and TRIAGE_ROUTER_ID to frontend/.env.local and restart the dev server."
          });
          controller.close();
          return;
        }
        if (!triageId) {
          send("error", { message: "TRIAGE_ROUTER_ID is not configured in .env.local." });
          controller.close();
          return;
        }

        // 1) intake — generate a random ticket (instant).
        const ticket: SimTicket = generateRandomTicket(categoryParam ?? undefined);
        send("intake", { ticket });
        await pause(450);

        // 2) triage_start — the real triage router is engaged.
        send("triage_start", { message: "Triage Router engaged — classifying and routing…" });

        // 3) await the REAL execute call (20–70s; triage + specialist delegation).
        const message = `NEW SUPPORT TICKET [${ticket.id}]\nSubject: ${ticket.subject}\n\n${ticket.body}`;
        const started = Date.now();

        const controllerAbort = new AbortController();
        const timeout = setTimeout(() => controllerAbort.abort(), 90_000);

        let data: any;
        try {
          const resp = await fetch(`${baseUrl}/api/agents/${triageId}/execute`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ message }),
            signal: controllerAbort.signal
          });
          if (!resp.ok) {
            const text = await resp.text().catch(() => "");
            throw new Error(`Bonito execute failed (HTTP ${resp.status}). ${text.slice(0, 200)}`);
          }
          data = await resp.json();
        } finally {
          clearTimeout(timeout);
        }

        const elapsedSeconds = Math.round(((Date.now() - started) / 1000) * 10) / 10;
        const content: string = data?.content ?? data?.response ?? "";
        const model: string = data?.model_used ?? "unknown";
        const tokens: number = typeof data?.tokens === "number" ? data.tokens : 0;
        const cost: number = typeof data?.cost === "number" ? data.cost : Number.parseFloat(data?.cost ?? "0") || 0;

        const parsed = parseJson(content);

        // 4) classified — real, parsed.
        const classification: string = parsed.classification ?? "unknown";
        const severity: string = parsed.severity ?? "unknown";
        const confidence: number =
          typeof parsed.confidence === "number" ? parsed.confidence : Number.parseFloat(parsed.confidence ?? "0") || 0;
        send("classified", { classification, severity, confidence });
        await pause(REVEAL_PAUSE);

        // 5) routed — real routing decision.
        const { routing, isEscalation } = determineRouting(parsed);
        send("routed", {
          routing,
          isEscalation,
          routingLabel: SPECIALIST_LABELS[routing] ?? routing
        });
        await pause(REVEAL_PAUSE);

        // 6) specialist + KB consulted.
        const kb = CLASSIFICATION_KB[isEscalation ? "escalation" : classification] ?? "Client Directory";
        send("specialist", {
          specialist: routing,
          specialistLabel: SPECIALIST_LABELS[routing] ?? routing,
          kb,
          snippet: shortSnippet(parsed),
          isEscalation
        });
        await pause(REVEAL_PAUSE);

        // 7) resolved — real human-readable resolution.
        const resolution = extractResolution(parsed, content);
        send("resolved", { resolution });
        await pause(REVEAL_PAUSE);

        // 8) evaluated — triage correctness + resolution sanity.
        const triageCorrect = routing === ticket.expectedRouting;
        const resolved = looksResolved(resolution);
        send("evaluated", { triageCorrect, resolved });
        await pause(REVEAL_PAUSE);

        // 9) complete — persist + emit the full run record.
        const run: LiveRun = {
          runId: `${ticket.id}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          ticketLabel: ticket.id,
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
          elapsedSeconds
        };

        appendLiveRun(run);
        send("complete", { run });
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Live simulation failed unexpectedly.";
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ stage: "error", message })}\n\n`));
        } catch {
          // controller may already be closed
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
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
