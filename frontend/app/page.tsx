import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Ticket, Timer, UserRound, Zap } from "lucide-react";
import { DashboardCharts } from "@/components/charts/dashboard-charts";
import { RecentRuns } from "@/components/dashboard/recent-runs";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatSeconds, getDashboardMetrics, getTicketViews } from "@/lib/demo-data";
import { readLiveRuns } from "@/lib/live-runs";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const metrics = getDashboardMetrics();
  const tickets = getTicketViews();
  const allLiveRuns = readLiveRuns();
  const totalRunCount = allLiveRuns.length;
  const RECENT_LIMIT = 15;
  const liveRuns = allLiveRuns.slice(-RECENT_LIMIT).reverse();

  // Buyer-facing KPIs lead with VALUE, not an accuracy score — across the full
  // handled history (canonical demo tickets + every stored run). "Auto-resolved"
  // = handled without a human (not escalated); escalations are the ones we
  // correctly hand to a person. Labor saved assumes ~8 min human handle per
  // Tier-1 ticket (industry AHT) for the tickets the AI deflected.
  const ESCALATED = (routing: string) => (routing || "").toUpperCase() === "ESCALATION";
  const HUMAN_MIN_PER_TICKET = 8;

  const canonN = metrics.totalTickets;
  const canonEscalations = tickets.filter((v) => v.status === "escalated").length;
  const canonAutoResolved = tickets.filter((v) => v.status === "resolved").length;

  const live = allLiveRuns.reduce(
    (a, r) => ({
      n: a.n + 1,
      escalations: a.escalations + (ESCALATED(r.routing) ? 1 : 0),
      autoResolved: a.autoResolved + (r.resolved && !ESCALATED(r.routing) ? 1 : 0),
      secs: a.secs + (Number(r.elapsedSeconds) || 0)
    }),
    { n: 0, escalations: 0, autoResolved: 0, secs: 0 }
  );

  const totalN = canonN + live.n;
  const escalations = canonEscalations + live.escalations;
  const autoResolved = canonAutoResolved + live.autoResolved;
  const autoResolvedPct = totalN ? Math.round((autoResolved / totalN) * 100) : 0;
  const avgSecs = totalN ? (metrics.avgHandleSeconds * canonN + live.secs) / totalN : 0;
  const laborHoursSaved = Math.round((autoResolved * HUMAN_MIN_PER_TICKET) / 60);

  const kpis = [
    { label: "Tickets handled", value: totalN.toLocaleString(), icon: Ticket },
    { label: "Auto-resolution rate", value: `${autoResolvedPct}%`, icon: CheckCircle2 },
    { label: "Human escalations", value: escalations.toLocaleString(), icon: UserRound },
    { label: "Est. labor saved", value: `≈${laborHoursSaved.toLocaleString()} hrs`, icon: Timer },
    { label: "Avg response", value: formatSeconds(avgSecs), icon: Zap }
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
              <RecentRuns runs={liveRuns} />
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
