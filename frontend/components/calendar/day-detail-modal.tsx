"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { StatusBadge } from "@/components/tickets/status-badge";
import { TicketModal } from "@/components/tickets/ticket-modal";
import { Badge } from "@/components/ui/badge";
import { DialogContent, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatSeconds, formatTime } from "@/lib/format";
import { liveRunToModal, sourceFromRunId } from "@/lib/run-rows";
import type { ModalRun, RunSource } from "@/components/tickets/ticket-modal";
import type { LiveRun } from "@/lib/live-runs";
import type { TicketStatus } from "@/types/demo";

const specialistDisplay: Record<string, string> = {
  "password-specialist": "Password & Account Specialist",
  "connectivity-specialist": "Connectivity & VPN Specialist",
  "software-specialist": "Software & Provisioning Specialist",
  "general-support": "General Support",
  ESCALATION: "Human escalation"
};

const sourceBadge: Record<RunSource, { label: string; className: string }> = {
  live: { label: "LIVE", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  burst: { label: "BURST", className: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  seed: { label: "SAMPLE", className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400" },
  canonical: { label: "DEMO", className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400" }
};

function routingLabel(routing: string) {
  return specialistDisplay[routing] ?? (routing || "—");
}

function deriveStatus(routing: string, resolved: boolean): TicketStatus {
  if ((routing || "").toUpperCase() === "ESCALATION") return "escalated";
  return resolved ? "resolved" : "in-progress";
}

function humanize(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DayDetailModal({
  date,
  runs,
  onClose
}: {
  date: string; // YYYY-MM-DD (local)
  runs: LiveRun[];
  onClose: () => void;
}) {
  // Portal + SSR guard, same pattern as TicketModal.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Nested per-ticket modal (drill-in from a row).
  const [ticket, setTicket] = React.useState<ModalRun | null>(null);

  // Escape closes the topmost modal (ticket first, then the day list); lock scroll.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (ticket) setTicket(null);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [ticket, onClose]);

  const friendly = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  // Newest-first by timestamp.
  const sorted = React.useMemo(
    () =>
      [...runs].sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || "")),
    [runs]
  );

  // Summary strip: resolved / escalated / top categories.
  const summary = React.useMemo(() => {
    let resolved = 0;
    let escalated = 0;
    const byCategory: Record<string, number> = {};
    for (const r of runs) {
      const isEsc = (r.routing || "").toUpperCase() === "ESCALATION";
      if (isEsc) escalated += 1;
      else if (r.resolved) resolved += 1;
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    }
    const topCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return { resolved, escalated, topCategories };
  }, [runs]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div role="dialog" aria-modal="true" aria-label={`Tickets on ${friendly}`}>
        <DialogOverlay onClick={onClose} />
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Day detail</div>
                <DialogTitle className="mt-1.5 text-zinc-50">{friendly}</DialogTitle>
                <div className="mt-1 text-sm text-zinc-500">
                  {runs.length} ticket{runs.length === 1 ? "" : "s"}
                </div>
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

          {/* Summary strip */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
              <span className="tabular-nums font-medium">{summary.resolved}</span> auto-resolved
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-300">
              <span className="tabular-nums font-medium">{summary.escalated}</span> escalated
            </span>
            {summary.topCategories.map(([cat, n]) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-zinc-950 px-2.5 py-1 text-zinc-400"
              >
                {humanize(cat)} <span className="tabular-nums text-zinc-500">{n}</span>
              </span>
            ))}
          </div>

          <Separator />

          {/* Ticket list */}
          {sorted.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">No tickets on this day.</p>
          ) : (
            <div className="max-h-[60vh] overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border text-[10px] uppercase tracking-wide text-zinc-500">
                    <th className="px-2 py-2 font-medium">Time</th>
                    <th className="px-2 py-2 font-medium">Ticket</th>
                    <th className="px-2 py-2 font-medium">Source</th>
                    <th className="px-2 py-2 font-medium">Category</th>
                    <th className="px-2 py-2 font-medium">Class.</th>
                    <th className="px-2 py-2 font-medium">Sev / Conf</th>
                    <th className="px-2 py-2 font-medium">Routing</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Model</th>
                    <th className="px-2 py-2 text-right font-medium">Tokens</th>
                    <th className="px-2 py-2 text-right font-medium">Cost</th>
                    <th className="px-2 py-2 text-right font-medium">Elapsed</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((run) => {
                    const src = sourceFromRunId(run.runId);
                    const badge = sourceBadge[src];
                    const isEsc = (run.routing || "").toUpperCase() === "ESCALATION";
                    const status = deriveStatus(run.routing, Boolean(run.resolved));
                    return (
                      <tr
                        key={run.runId}
                        onClick={() => setTicket(liveRunToModal(run))}
                        className="cursor-pointer border-b border-border/60 align-middle transition-colors hover:bg-accent"
                        tabIndex={0}
                        role="button"
                        aria-label={`Open ${run.ticketLabel}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setTicket(liveRunToModal(run));
                          }
                        }}
                      >
                        <td className="whitespace-nowrap px-2 py-2 tabular-nums text-zinc-400">
                          {run.timestamp ? formatTime(run.timestamp) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 font-mono text-zinc-300">{run.ticketLabel}</td>
                        <td className="px-2 py-2">
                          <span
                            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-zinc-300">{humanize(run.category)}</td>
                        <td className="whitespace-nowrap px-2 py-2 text-zinc-400">{run.classification || "—"}</td>
                        <td className="whitespace-nowrap px-2 py-2 text-zinc-400">
                          {run.severity || "—"}
                          <span className="text-zinc-600">
                            {" "}
                            / {typeof run.confidence === "number" ? `${run.confidence}%` : "—"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2">
                          {isEsc ? (
                            <Badge variant="escalated" className="text-[9px]">
                              ESCALATED
                            </Badge>
                          ) : (
                            <span className="text-zinc-300">{routingLabel(run.routing)}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <StatusBadge status={status} />
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 font-mono text-[10px] text-zinc-400">
                          {run.model || "—"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-zinc-400">
                          {run.tokens ? run.tokens.toLocaleString() : "—"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-zinc-300">
                          {formatCurrency(Number(run.cost) || 0)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-zinc-400">
                          {formatSeconds(Number(run.elapsedSeconds) || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] leading-5 text-zinc-600">
            Click any ticket to open its full detail. Sample (seeded) runs carry synthetic agent details;
            burst and live runs carry the real triage + routing summary captured at run time.
          </p>
        </DialogContent>
      </div>

      {/* Nested per-ticket modal, rendered above the day list. Closing it returns here. */}
      <TicketModal run={ticket} onClose={() => setTicket(null)} />
    </>,
    document.body
  );
}
