import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Ticket, Timer, UserRound, Zap } from "lucide-react";
import { DashboardCharts } from "@/components/charts/dashboard-charts";
import { RecentRuns } from "@/components/dashboard/recent-runs";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatSeconds, getDashboardMetrics, getTicketViews } from "@/lib/demo-data";
import { localDateKey, readLiveRuns } from "@/lib/live-runs";
import { cn } from "@/lib/utils";

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

  // --- Time-series for the value/ROI charts -------------------------------
  // A human-only desk would pay this per Tier-1 ticket; we only count savings on
  // AUTO-RESOLVED tickets (resolved AND not escalated) — escalations still
  // needed a human, so they save no labor (consistent with "Est. labor saved").
  // $27 CAD/ticket (~$20 USD): near the top of the realistic range and just under
  // MetricNet's 2024 Tier-1 benchmark of ~$22 USD (~$30 CAD). Account is Canadian.
  const HUMAN_COST_PER_TICKET = 27;

  // Per-day aggregates from the stored runs (canonical 10 carry no timestamp).
  type DayAgg = { date: string; count: number; autoResolved: number; secs: number };
  const dayMap = new Map<string, DayAgg>();
  for (const r of allLiveRuns) {
    if (!r.timestamp) continue;
    const key = localDateKey(r.timestamp);
    const agg = dayMap.get(key) ?? { date: key, count: 0, autoResolved: 0, secs: 0 };
    agg.count += 1;
    if (r.resolved && !ESCALATED(r.routing)) agg.autoResolved += 1;
    agg.secs += Number(r.elapsedSeconds) || 0;
    dayMap.set(key, agg);
  }
  const sortedDays = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Fold the canonical (timestamp-less) tickets into the earliest day so they
  // count in the totals without inventing a date for the time-series.
  if (sortedDays.length > 0) {
    sortedDays[0].count += canonN;
    sortedDays[0].autoResolved += canonAutoResolved;
  }

  // b. Cost saved — cumulative auto-resolved × $7 over the timeline.
  let running = 0;
  const costSavedByDay = sortedDays.map((d) => {
    running += d.autoResolved * HUMAN_COST_PER_TICKET;
    return { date: d.date, cumulative: running };
  });

  // c. Resolution time — average latency (seconds) per day.
  const resolutionByDay = sortedDays.map((d) => ({
    date: d.date,
    avgSeconds: d.count ? d.secs / d.count : 0
  }));

  // d. Tickets handled per day (last ~30 days).
  const ticketsByDay = sortedDays.slice(-30).map((d) => ({ date: d.date, count: d.count }));

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
            Live agent runs against Bonito — triage, KB-grounded resolution, autoscaling, and escalation —
            shown alongside a 30-day sample history for volume context.
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

      <DashboardCharts
        categoryCounts={metrics.categoryCounts}
        costSavedByDay={costSavedByDay}
        resolutionByDay={resolutionByDay}
        ticketsByDay={ticketsByDay}
      />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
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
                <TableHead className="hidden md:table-cell">Assigned Specialist</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Quality</TableHead>
                <TableHead className="hidden sm:table-cell">Latency</TableHead>
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
                  <TableCell className="text-zinc-300 sm:min-w-72">{view.ticket.subject}</TableCell>
                  <TableCell className="hidden text-zinc-400 md:table-cell">{view.assignedSpecialist}</TableCell>
                  <TableCell>
                    <StatusBadge status={view.status} />
                  </TableCell>
                  <TableCell className={cn("hidden lg:table-cell", view.result?.resolution_quality_correct ? "text-emerald-300" : "text-red-300")}>
                    {view.result?.resolution_quality_correct ? "Pass" : "Review"}
                  </TableCell>
                  <TableCell className="hidden text-zinc-400 sm:table-cell">{formatSeconds(view.latencySeconds)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
