"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const colors = ["#7c3aed", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a1a1aa"];

type DashboardChartsProps = {
  categoryCounts: Array<{ name: string; value: number }>;
  costOverTime: Array<{ ticket: string; cost: number }>;
};

export function DashboardCharts({ categoryCounts, costOverTime }: DashboardChartsProps) {
  const maxCategory = Math.max(...categoryCounts.map((entry) => entry.value), 1);
  const maxCost = Math.max(...costOverTime.map((entry) => entry.cost), 0.0001);
  // Bars are sized in PIXELS, not %: a percentage height only resolves against a
  // parent with a definite height, and the flex-col column here is content-sized
  // — so `height: X%` collapsed to 0 and the bars were invisible.
  const BAR_AREA_PX = 200;

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Tickets by Category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categoryCounts.map((entry, index) => (
            <div key={entry.name}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-300">{entry.name}</span>
                <span className="text-zinc-500">{entry.value}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-900">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${(entry.value / maxCategory) * 100}%`, backgroundColor: colors[index % colors.length] }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cost Over Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-end gap-2 border-b border-l border-border px-3 pb-3">
            {costOverTime.map((entry) => (
              <div key={entry.ticket} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t bg-primary"
                  style={{ height: `${Math.max((entry.cost / maxCost) * BAR_AREA_PX, 4)}px` }}
                  title={`${entry.ticket}: $${entry.cost.toFixed(6)}`}
                />
                <div className="text-[0.65rem] text-zinc-500">{entry.ticket.replace("BP-", "")}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
