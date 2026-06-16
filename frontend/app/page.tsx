import Link from "next/link";
import { Activity, ArrowUpRight, Clock, Coins, Gauge, Ticket } from "lucide-react";
import { DashboardCharts } from "@/components/charts/dashboard-charts";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatSeconds, getDashboardMetrics, getTicketViews } from "@/lib/demo-data";
import { readLiveRuns } from "@/lib/live-runs";

export const dynamic = "force-dynamic";

const specialistDisplay: Record<string, string> = {
  "password-specialist": "Password & Account Specialist",
  "connectivity-specialist": "Connectivity & VPN Specialist",
  "software-specialist": "Software & Provisioning Specialist",
  "general-support": "General Support",
  ESCALATION: "Human escalation"
};

export default function DashboardPage() {
  const metrics = getDashboardMetrics();
  const tickets = getTicketViews();
  const allLiveRuns = readLiveRuns();
  const totalRunCount = allLiveRuns.length;
  const RECENT_LIMIT = 15;
  const liveRuns = allLiveRuns.slice(-RECENT_LIMIT).reverse();

  // KPIs span the FULL handled history — the canonical demo tickets plus every
  // stored run (live, burst, seeded). Recover the canonical counts from the
  // aggregated percentages (exact for the 10-ticket set) and fold in the store
  // so the cards stay consistent with the queue + calendar.
  const canonN = metrics.totalTickets;
  const canonTriage = Math.round((metrics.triageCorrectPct / 100) * canonN);
  const canonResolved = Math.round((metrics.resolutionQualityPct / 100) * canonN);
  const live = allLiveRuns.reduce(
    (a, r) => ({
      n: a.n + 1,
      triage: a.triage + (r.triageCorrect ? 1 : 0),
      resolved: a.resolved + (r.resolved ? 1 : 0),
      secs: a.secs + (Number(r.elapsedSeconds) || 0),
      cost: a.cost + (Number(r.cost) || 0)
    }),
    { n: 0, triage: 0, resolved: 0, secs: 0, cost: 0 }
  );
  const totalN = canonN + live.n;
  const pct = (num: number) => (totalN ? Math.round((num / totalN) * 100) : 0);
  const triagePct = pct(canonTriage + live.triage);
  const resolutionPct = pct(canonResolved + live.resolved);
  const avgSecs = totalN ? (metrics.avgHandleSeconds * canonN + live.secs) / totalN : 0;
  const totalCost = metrics.totalCost + live.cost;

  const kpis = [
    { label: "Total tickets", value: totalN.toLocaleString(), icon: Ticket },
    { label: "Triage correctness", value: `${triagePct}%`, icon: Gauge },
    { label: "Resolution quality", value: `${resolutionPct}%`, icon: Gauge },
    { label: "Avg handle time", value: formatSeconds(avgSecs), icon: Clock },
    { label: "Total cost", value: formatCurrency(totalCost), icon: Coins }
  ];

  return (
    <div className="space-y-8">
      <section>
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Bulletproof MSP operations</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-50">Tier 1 queue overview</h2>
          <p className="mt-3 text-base leading-7 text-zinc-500">
            Silver Bullet demo queue with local run history, live-run controls, webhook ingest paths, and integration settings.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-500">{kpi.label}</div>
                <kpi.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-4 text-2xl font-semibold tracking-normal text-zinc-50">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <DashboardCharts categoryCounts={metrics.categoryCounts} costOverTime={metrics.costOverTime} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Ticket Queue</CardTitle>
            {totalRunCount > RECENT_LIMIT && (
              <span className="text-xs text-zinc-500">
                showing {liveRuns.length} of {totalRunCount} runs
              </span>
            )}
          </div>
          <Link href="/simulate" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80">
            Run a live ticket
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Assigned Specialist</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liveRuns.map((run) => (
                <TableRow key={run.runId} className="bg-primary/[0.03]">
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
                  <TableCell className="text-zinc-400">
                    {specialistDisplay[run.routing] ?? run.routing}
                  </TableCell>
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
              {tickets.map((view) => (
                <TableRow key={view.ticket.id}>
                  <TableCell className="font-medium text-zinc-100">
                    <Link href={`/tickets/${view.ticket.id}`} className="hover:text-primary">
                      {view.ticket.id}
                    </Link>
                  </TableCell>
                  <TableCell className="min-w-72 text-zinc-300">{view.ticket.subject}</TableCell>
                  <TableCell className="text-zinc-400">{view.assignedSpecialist}</TableCell>
                  <TableCell>
                    <StatusBadge status={view.status} />
                  </TableCell>
                  <TableCell className={view.result?.resolution_quality_correct ? "text-emerald-300" : "text-red-300"}>
                    {view.result?.resolution_quality_correct ? "Pass" : "Review"}
                  </TableCell>
                  <TableCell className="text-zinc-400">{formatSeconds(view.latencySeconds)}</TableCell>
                  <TableCell className="text-zinc-400">{formatCurrency(view.cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
