import Link from "next/link";
import { ArrowUpRight, Clock, Coins, Gauge, Ticket } from "lucide-react";
import { DashboardCharts } from "@/components/charts/dashboard-charts";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatSeconds, getDashboardMetrics, getTicketViews } from "@/lib/demo-data";

export default function DashboardPage() {
  const metrics = getDashboardMetrics();
  const tickets = getTicketViews();
  const kpis = [
    { label: "Total tickets", value: metrics.totalTickets.toString(), icon: Ticket },
    { label: "Resolved by automation", value: `${metrics.resolvedByAiPct}%`, icon: Gauge },
    { label: "Avg handle time", value: formatSeconds(metrics.avgHandleSeconds), icon: Clock },
    { label: "Total cost", value: formatCurrency(metrics.totalCost), icon: Coins },
    { label: "Avg cost per ticket", value: formatCurrency(metrics.avgCostPerTicket), icon: Coins }
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
          <CardTitle>Ticket Queue</CardTitle>
          <Link href="/tickets/BP-001" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80">
            Open first ticket
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
                <TableHead>Latency</TableHead>
                <TableHead>Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
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
