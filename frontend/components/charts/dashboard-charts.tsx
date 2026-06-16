"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const colors = ["#7c3aed", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a1a1aa"];

export type CostSavedPoint = { date: string; cumulative: number };
export type ResolutionPoint = { date: string; avgSeconds: number };
export type TicketsPoint = { date: string; count: number };

type DashboardChartsProps = {
  categoryCounts: Array<{ name: string; value: number }>;
  costSavedByDay: CostSavedPoint[];
  resolutionByDay: ResolutionPoint[];
  ticketsByDay: TicketsPoint[];
};

// Bars are sized in PIXELS, not %: a percentage height only resolves against a
// parent with a definite height, and the flex-col columns here are content-sized
// — so `height: X%` collapses to 0 and the bars become invisible.
const BAR_AREA_PX = 180;

/** Compact "May 18" style label from a YYYY-MM-DD key (no timezone surprises). */
function shortDay(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function moneyShort(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

export function DashboardCharts({
  categoryCounts,
  costSavedByDay,
  resolutionByDay,
  ticketsByDay
}: DashboardChartsProps) {
  const maxCategory = Math.max(...categoryCounts.map((entry) => entry.value), 1);

  // --- Cost saved (cumulative area) ---
  const savedTotal = costSavedByDay.length ? costSavedByDay[costSavedByDay.length - 1].cumulative : 0;
  const maxSaved = Math.max(...costSavedByDay.map((p) => p.cumulative), 1);
  const W = 640;
  const H = 180;
  const stepX = costSavedByDay.length > 1 ? W / (costSavedByDay.length - 1) : 0;
  const pointXY = (i: number, v: number) => {
    const x = costSavedByDay.length > 1 ? i * stepX : W / 2;
    const y = H - (v / maxSaved) * H;
    return { x, y };
  };
  const linePoints = costSavedByDay.map((p, i) => {
    const { x, y } = pointXY(i, p.cumulative);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const areaPoints =
    costSavedByDay.length > 0
      ? `0,${H} ${linePoints.join(" ")} ${(costSavedByDay.length > 1 ? W : W / 2).toFixed(1)},${H}`
      : "";

  // --- Resolution time (line) ---
  const maxRes = Math.max(...resolutionByDay.map((p) => p.avgSeconds), 1);
  const resStepX = resolutionByDay.length > 1 ? W / (resolutionByDay.length - 1) : 0;
  const resLinePoints = resolutionByDay.map((p, i) => {
    const x = resolutionByDay.length > 1 ? i * resStepX : W / 2;
    const y = H - (p.avgSeconds / maxRes) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // --- Tickets handled (vertical bars) ---
  const maxTickets = Math.max(...ticketsByDay.map((p) => p.count), 1);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {/* a. Tickets by Category */}
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
                  style={{
                    width: `${(entry.value / maxCategory) * 100}%`,
                    backgroundColor: colors[index % colors.length]
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* b. Cost Saved Vs. Human Only Desk */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Saved Vs. Human Only Desk</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-1 text-2xl font-semibold tracking-normal text-emerald-300">
            {moneyShort(savedTotal)} CAD saved
          </div>
          <div className="mb-4 text-[11px] leading-5 text-zinc-500">
            $27 CAD/ticket on auto-resolved tickets — conservative vs MetricNet&apos;s 2024 Tier-1
            benchmark of ~$22 USD (~$30 CAD).
          </div>
          {costSavedByDay.length === 0 ? (
            <div className="flex h-[180px] items-center justify-center text-sm text-zinc-600">
              No timeline data yet.
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="h-[180px] w-full"
              role="img"
              aria-label="Cumulative cost saved over time"
            >
              <defs>
                <linearGradient id="savedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <polygon points={areaPoints} fill="url(#savedFill)" />
              <polyline
                points={linePoints.join(" ")}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
          <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
            <span>{costSavedByDay.length ? shortDay(costSavedByDay[0].date) : ""}</span>
            <span>{costSavedByDay.length ? shortDay(costSavedByDay[costSavedByDay.length - 1].date) : ""}</span>
          </div>
        </CardContent>
      </Card>

      {/* c. Resolution Time Over Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Resolution Time Over Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-[11px] text-zinc-500">Average resolution latency per day (seconds).</div>
          {resolutionByDay.length === 0 ? (
            <div className="flex h-[180px] items-center justify-center text-sm text-zinc-600">
              No timeline data yet.
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="h-[180px] w-full"
              role="img"
              aria-label="Average resolution time per day in seconds"
            >
              <polyline
                points={resLinePoints.join(" ")}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
          <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
            <span>{resolutionByDay.length ? `${Math.round(resolutionByDay[0].avgSeconds)}s` : ""}</span>
            <span>peak ≈ {Math.round(maxRes)}s</span>
          </div>
        </CardContent>
      </Card>

      {/* d. Tickets Handled Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets Handled Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-[11px] text-zinc-500">Ticket volume per day.</div>
          {ticketsByDay.length === 0 ? (
            <div className="flex h-[180px] items-center justify-center text-sm text-zinc-600">
              No timeline data yet.
            </div>
          ) : (
            <div
              className="flex items-end gap-1 border-b border-l border-border px-2 pb-2"
              style={{ height: `${BAR_AREA_PX + 24}px` }}
            >
              {ticketsByDay.map((entry) => (
                <div key={entry.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <div
                    className="w-full rounded-t bg-primary"
                    style={{ height: `${Math.max((entry.count / maxTickets) * BAR_AREA_PX, 3)}px` }}
                    title={`${shortDay(entry.date)}: ${entry.count} ticket${entry.count === 1 ? "" : "s"}`}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
            <span>{ticketsByDay.length ? shortDay(ticketsByDay[0].date) : ""}</span>
            <span>{ticketsByDay.length ? shortDay(ticketsByDay[ticketsByDay.length - 1].date) : ""}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
