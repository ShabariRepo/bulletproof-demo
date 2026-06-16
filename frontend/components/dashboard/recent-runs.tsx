"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { ModalRun, TicketModal } from "@/components/tickets/ticket-modal";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { liveRunToModal } from "@/lib/run-rows";
import { formatCurrency, formatSeconds } from "@/lib/format";
import type { LiveRun } from "@/lib/live-runs";

const specialistDisplay: Record<string, string> = {
  "password-specialist": "Password & Account Specialist",
  "connectivity-specialist": "Connectivity & VPN Specialist",
  "software-specialist": "Software & Provisioning Specialist",
  "general-support": "General Support",
  ESCALATION: "Human escalation"
};

/**
 * The recent live/burst/seed run rows on the dashboard. Each row is clickable
 * and opens the shared TicketModal — store runs have no detail page of their
 * own. Canonical ticket rows are rendered separately on the dashboard and keep
 * their existing Link to /tickets/[id].
 */
export function RecentRuns({ runs }: { runs: LiveRun[] }) {
  const [active, setActive] = React.useState<ModalRun | null>(null);

  return (
    <>
      {runs.map((run) => (
        <TableRow
          key={run.runId}
          onClick={() => setActive(liveRunToModal(run))}
          className="cursor-pointer bg-primary/[0.03] hover:bg-primary/[0.07]"
        >
          <TableCell className="font-medium text-zinc-100">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">{run.ticketLabel}</span>
              <Badge variant="default" className="gap-1 text-[10px]">
                <Activity className="h-3 w-3" />
                LIVE
              </Badge>
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">{new Date(run.timestamp).toLocaleString()}</div>
          </TableCell>
          <TableCell className="min-w-72 text-zinc-300">{run.subject}</TableCell>
          <TableCell className="text-zinc-400">{specialistDisplay[run.routing] ?? run.routing}</TableCell>
          <TableCell>
            <StatusBadge status={run.routing === "ESCALATION" ? "escalated" : run.resolved ? "resolved" : "in-progress"} />
          </TableCell>
          <TableCell className={run.triageCorrect && run.resolved ? "text-emerald-300" : "text-amber-300"}>
            {run.triageCorrect && run.resolved ? "Pass" : "Review"}
          </TableCell>
          <TableCell className="text-zinc-400">{formatSeconds(run.elapsedSeconds)}</TableCell>
          <TableCell className="text-zinc-400">{formatCurrency(run.cost)}</TableCell>
        </TableRow>
      ))}

      <TicketModal run={active} onClose={() => setActive(null)} />
    </>
  );
}
