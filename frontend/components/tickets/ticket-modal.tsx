"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Badge } from "@/components/ui/badge";
import { DialogContent, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDateTime, formatSeconds } from "@/lib/format";
import type { TicketStatus } from "@/types/demo";

const specialistDisplay: Record<string, string> = {
  "password-specialist": "Password & Account Specialist",
  "connectivity-specialist": "Connectivity & VPN Specialist",
  "software-specialist": "Software & Provisioning Specialist",
  "general-support": "General Support",
  ESCALATION: "Human escalation"
};

/** Source of a run, derived from the runId prefix. */
export type RunSource = "canonical" | "live" | "burst" | "seed";

/**
 * Normalized shape consumed by the modal. Both stored LiveRuns and (if needed)
 * canonical tickets can be projected onto this. Note: LiveRun does NOT carry a
 * full agent transcript, so the modal renders the structured summary it has —
 * it never fabricates a response body.
 */
export type ModalRun = {
  key: string;
  label: string;
  subject: string;
  dateISO: string | null;
  category: string;
  classification: string;
  severity: string;
  confidence: number | null;
  routing: string;
  expectedRouting: string;
  triageCorrect: boolean;
  resolved: boolean;
  model: string;
  tokens: number;
  cost: number;
  elapsedSeconds: number;
  source: RunSource;
};

function deriveStatus(routing: string, resolved: boolean): TicketStatus {
  if ((routing || "").toUpperCase() === "ESCALATION") return "escalated";
  return resolved ? "resolved" : "in-progress";
}

function routingLabel(routing: string) {
  return specialistDisplay[routing] ?? routing;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-zinc-950 p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className="mt-1.5 text-sm text-zinc-200">{children}</div>
    </div>
  );
}

export function TicketModal({ run, onClose }: { run: ModalRun | null; onClose: () => void }) {
  // Portal to document.body so the modal never lands inside invalid DOM (e.g. a
  // <tbody> when driven from a table row). Mounted flag guards SSR.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Close on Escape and lock background scroll while open.
  React.useEffect(() => {
    if (!run) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [run, onClose]);

  if (!run || !mounted) return null;

  const status = deriveStatus(run.routing, run.resolved);
  const isEscalation = (run.routing || "").toUpperCase() === "ESCALATION";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${run.label} details`}>
      <DialogOverlay onClick={onClose} />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-zinc-400">{run.label}</span>
                <StatusBadge status={status} />
                {run.source === "seed" && (
                  <Badge variant="outline" className="text-[10px] text-zinc-500">
                    sample history
                  </Badge>
                )}
              </div>
              <DialogTitle className="mt-2 truncate text-zinc-50">{run.subject}</DialogTitle>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-accent hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <Separator />

        <div className="grid gap-2.5 sm:grid-cols-3">
          <Field label="Category">{run.category || "—"}</Field>
          <Field label="Classification">{run.classification || "—"}</Field>
          <Field label="Severity">{run.severity || "—"}</Field>

          <Field label="Routing">
            {isEscalation ? (
              <Badge variant="escalated" className="text-[10px]">
                ESCALATED
              </Badge>
            ) : (
              routingLabel(run.routing)
            )}
          </Field>
          <Field label="Expected routing">{routingLabel(run.expectedRouting)}</Field>
          <Field label="Triage correct">
            {run.triageCorrect ? (
              <span className="text-emerald-300">✓ Correct</span>
            ) : (
              <span className="text-red-300">✗ Misrouted</span>
            )}
          </Field>

          <Field label="Confidence">{run.confidence == null ? "—" : `${run.confidence}%`}</Field>
          <Field label="Resolved">
            {run.resolved ? <span className="text-emerald-300">Yes</span> : <span className="text-amber-300">No</span>}
          </Field>
          <Field label="Model">
            <span className="font-mono text-xs">{run.model || "—"}</span>
          </Field>

          <Field label="Tokens">{run.tokens ? run.tokens.toLocaleString() : "—"}</Field>
          <Field label="Cost">{formatCurrency(run.cost)}</Field>
          <Field label="Elapsed">{formatSeconds(run.elapsedSeconds)}</Field>
        </div>

        {run.dateISO && (
          <div className="text-[11px] text-zinc-500">
            Run recorded {formatDateTime(run.dateISO)}
          </div>
        )}

        <p className="text-[11px] leading-5 text-zinc-600">
          Stored runs keep the structured triage + routing summary. The full agent transcript is not
          retained for history runs — open Live Sim to watch a fresh run end to end.
        </p>
      </DialogContent>
    </div>,
    document.body
  );
}
