import type { ModalRun, RunSource } from "@/components/tickets/ticket-modal";
import type { LiveRun } from "@/lib/live-runs";
import type { TicketView } from "@/types/demo";

/**
 * Unified row shape for the /tickets browser. Both the 10 canonical demo
 * tickets and the stored LiveRuns are normalized onto this so they can be
 * filtered, sorted, and paginated together.
 *
 * - Canonical rows: have a real detail page (`detailHref`), no `dateISO`.
 * - Store rows (seed/live/burst): no detail page (`detailHref: null`) — they
 *   open the shared TicketModal instead, and carry the full ModalRun payload.
 */
export type TicketRow = {
  key: string;
  label: string;
  subject: string;
  dateISO: string | null;
  category: string;
  classification: string;
  severity: string;
  routing: string;
  routingLabel: string;
  status: "resolved" | "escalated" | "in-progress";
  triageCorrect: boolean;
  cost: number;
  source: RunSource;
  detailHref: string | null;
  /** Present for store rows so the client can drive the modal without a refetch. */
  modal: ModalRun | null;
};

const specialistDisplay: Record<string, string> = {
  "password-specialist": "Password & Account Specialist",
  "connectivity-specialist": "Connectivity & VPN Specialist",
  "software-specialist": "Software & Provisioning Specialist",
  "general-support": "General Support",
  ESCALATION: "Human escalation"
};

function routingLabel(routing: string) {
  return specialistDisplay[routing] ?? (routing || "—");
}

/** Map a stored runId prefix to its source bucket. */
export function sourceFromRunId(runId: string): RunSource {
  if (runId.startsWith("seed-")) return "seed";
  if (runId.startsWith("burst-")) return "burst";
  // Single live runs are persisted as `${ticket.id}-${ts}` (ticket ids like
  // SIM-#####), and any non-seed/non-burst id is a real run → "live".
  return "live";
}

/** Project a stored LiveRun onto the modal's normalized shape. */
export function liveRunToModal(run: LiveRun): ModalRun {
  return {
    key: run.runId,
    label: run.ticketLabel,
    subject: run.subject,
    dateISO: run.timestamp ?? null,
    category: run.category,
    classification: run.classification,
    severity: run.severity,
    confidence: typeof run.confidence === "number" ? run.confidence : null,
    routing: run.routing,
    expectedRouting: run.expectedRouting,
    triageCorrect: Boolean(run.triageCorrect),
    resolved: Boolean(run.resolved),
    model: run.model,
    tokens: Number(run.tokens) || 0,
    cost: Number(run.cost) || 0,
    elapsedSeconds: Number(run.elapsedSeconds) || 0,
    source: sourceFromRunId(run.runId)
  };
}

function statusFor(routing: string, resolved: boolean): TicketRow["status"] {
  if ((routing || "").toUpperCase() === "ESCALATION") return "escalated";
  return resolved ? "resolved" : "in-progress";
}

/** Stored run → unified row (opens the modal on click). */
export function liveRunToRow(run: LiveRun): TicketRow {
  const source = sourceFromRunId(run.runId);
  return {
    key: run.runId,
    label: run.ticketLabel,
    subject: run.subject,
    dateISO: run.timestamp ?? null,
    category: run.category,
    classification: run.classification,
    severity: run.severity,
    routing: run.routing,
    routingLabel: routingLabel(run.routing),
    status: statusFor(run.routing, Boolean(run.resolved)),
    triageCorrect: Boolean(run.triageCorrect),
    cost: Number(run.cost) || 0,
    source,
    detailHref: null,
    modal: liveRunToModal(run)
  };
}

/** Canonical demo ticket view → unified row (links to its real detail page). */
export function ticketViewToRow(view: TicketView): TicketRow {
  const result = view.result;
  const routing = result?.actual_routing ?? view.ticket.expectedRouting ?? "";
  const resolved = view.status === "resolved";
  return {
    key: view.ticket.id,
    label: view.ticket.id,
    subject: view.ticket.subject,
    dateISO: null,
    category: result?.parsed?.classification ?? result?.classification ?? view.ticket.type,
    classification: result?.parsed?.classification ?? result?.classification ?? view.ticket.type,
    severity: view.priority,
    routing,
    routingLabel: view.assignedSpecialist || routingLabel(routing),
    status:
      view.status === "queued"
        ? "in-progress"
        : (view.status as TicketRow["status"]),
    triageCorrect: Boolean(result?.triage_correct ?? result?.routing_correct),
    cost: view.cost,
    source: "canonical",
    detailHref: `/tickets/${view.ticket.id}`,
    modal: null
  };
}
