"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Coins, Flame, Maximize2, ShieldAlert, Ticket, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DayDetailModal } from "@/components/calendar/day-detail-modal";
import { cn } from "@/lib/utils";
import type { DayBucket, LiveRun } from "@/lib/live-runs";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fmtCost(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
    value || 0
  );
}

function humanize(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Map volume → node intensity (0..1) relative to the busiest day in view.
function intensity(total: number, max: number): number {
  if (total <= 0 || max <= 0) return 0;
  // sqrt so small days still register visibly but big days clearly dominate.
  return Math.sqrt(total / max);
}

export function NodeCalendar({
  buckets,
  runsByDay
}: {
  buckets: Record<string, DayBucket>;
  runsByDay: Record<string, LiveRun[]>;
}) {
  // Default to the month of the most recent run, else the current month.
  const initial = useMemo(() => {
    const keys = Object.keys(buckets).sort();
    const latest = keys[keys.length - 1];
    const d = latest ? new Date(latest + "T00:00:00") : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [buckets]);

  const [cursor, setCursor] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);
  // The day whose Expand modal is open (null = closed).
  const [expanded, setExpanded] = useState<string | null>(null);

  const { year, month } = cursor;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Busiest day in THIS month (for relative node scaling) + month totals.
  const monthStats = useMemo(() => {
    let max = 0;
    let total = 0;
    let escalations = 0;
    let busiestKey: string | null = null;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(year, month, d);
      const b = buckets[key];
      if (!b) continue;
      total += b.total;
      escalations += b.escalations;
      if (b.total > max) {
        max = b.total;
        busiestKey = key;
      }
    }
    return { max, total, escalations, busiestKey };
  }, [buckets, year, month, daysInMonth]);

  const cells: ({ day: number; key: string; bucket?: DayBucket } | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(year, month, d);
    cells.push({ day: d, key, bucket: buckets[key] });
  }

  const selectedBucket = selected ? buckets[selected] : undefined;

  const prevMonth = () =>
    setCursor(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }));
  const nextMonth = () =>
    setCursor(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }));

  return (
    <div className="space-y-6">
      {/* Header: month nav + stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-zinc-950 text-zinc-400 transition-colors hover:text-zinc-100"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[180px] text-center text-lg font-semibold text-zinc-50">
            {MONTH_NAMES[month]} {year}
          </div>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-zinc-950 text-zinc-400 transition-colors hover:text-zinc-100"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-zinc-950 px-3 py-1.5 text-zinc-300">
            <Ticket className="h-4 w-4 text-primary" />
            <span className="tabular-nums">{monthStats.total}</span> tickets
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-zinc-950 px-3 py-1.5 text-zinc-300">
            <ShieldAlert className="h-4 w-4 text-red-300" />
            <span className="tabular-nums">{monthStats.escalations}</span> escalated
          </span>
          {monthStats.busiestKey && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-amber-300">
              <Flame className="h-4 w-4" />
              Busiest {monthStats.busiestKey.slice(8)} ({buckets[monthStats.busiestKey].total})
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Calendar grid */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-3 grid grid-cols-7 gap-2 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-600">
              {WEEKDAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {cells.map((cell, idx) => {
                if (!cell) return <div key={`pad-${idx}`} />;
                const b = cell.bucket;
                const total = b?.total ?? 0;
                const t = intensity(total, monthStats.max);
                const isSelected = selected === cell.key;
                return (
                  <DayNode
                    key={cell.key}
                    day={cell.day}
                    total={total}
                    intensity={t}
                    escalations={b?.escalations ?? 0}
                    isSelected={isSelected}
                    onSelect={() => setSelected(isSelected ? null : cell.key)}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <span className="text-[11px] uppercase tracking-wide text-zinc-600">Quiet → Busy</span>
              <div className="flex items-center gap-1.5">
                {[0, 0.25, 0.5, 0.75, 1].map((level) => (
                  <span
                    key={level}
                    className="h-3.5 w-7 rounded"
                    style={{
                      background:
                        level === 0
                          ? "rgba(82,82,91,0.18)"
                          : `rgba(124, 58, 237, ${0.18 + level * 0.62})`,
                      boxShadow: level >= 0.75 ? "0 0 8px rgba(124,58,237,0.45)" : undefined
                    }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Day breakdown panel */}
        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardContent className="p-6">
            {selectedBucket ? (
              <DayBreakdown
                dateKey={selected!}
                bucket={selectedBucket}
                ticketCount={(runsByDay[selected!] ?? []).length}
                onExpand={() => setExpanded(selected)}
                onClose={() => setSelected(null)}
              />
            ) : selected ? (
              <EmptyDay dateKey={selected} onClose={() => setSelected(null)} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
                <Flame className="h-6 w-6 text-zinc-600" />
                <p className="text-sm text-zinc-500">
                  Click any day node to see its ticket breakdown — volume, escalations, misroutes, and category split.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {expanded && (
        <DayDetailModal
          date={expanded}
          runs={runsByDay[expanded] ?? []}
          onClose={() => setExpanded(null)}
        />
      )}
    </div>
  );
}

function DayNode({
  day,
  total,
  intensity: t,
  escalations,
  isSelected,
  onSelect
}: {
  day: number;
  total: number;
  intensity: number;
  escalations: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  // Node visuals scale with intensity: bigger inner dot + hotter color.
  const hasData = total > 0;
  const alpha = 0.18 + t * 0.62;
  const dotSize = 30 + Math.round(t * 30); // 30..60px inner glow
  const glow = t >= 0.6 ? `0 0 ${Math.round(8 + t * 16)}px rgba(124,58,237,${0.4 + t * 0.3})` : undefined;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex aspect-square items-center justify-center rounded-lg border transition-all",
        isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-zinc-600",
        !hasData && "bg-zinc-950/40"
      )}
      title={`${day}: ${total} ticket${total === 1 ? "" : "s"}`}
    >
      {/* glowing node */}
      {hasData && (
        <span
          className="absolute rounded-full transition-all"
          style={{
            width: `${dotSize}%`,
            height: `${dotSize}%`,
            background: `rgba(124, 58, 237, ${alpha})`,
            boxShadow: glow
          }}
        />
      )}
      {/* day number */}
      <span
        className={cn(
          "absolute left-1.5 top-1 text-[10px] tabular-nums",
          hasData ? "text-zinc-400" : "text-zinc-700"
        )}
      >
        {day}
      </span>
      {/* count */}
      {hasData && (
        <span className="relative z-10 text-sm font-semibold tabular-nums text-zinc-50">{total}</span>
      )}
      {/* escalation marker */}
      {escalations > 0 && (
        <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-red-400" title={`${escalations} escalated`} />
      )}
    </button>
  );
}

function DayBreakdown({
  dateKey,
  bucket,
  ticketCount,
  onExpand,
  onClose
}: {
  dateKey: string;
  bucket: DayBucket;
  ticketCount: number;
  onExpand: () => void;
  onClose: () => void;
}) {
  const friendly = new Date(dateKey + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
  const categories = Object.entries(bucket.byCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...categories.map(([, n]) => n));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500">Day detail</div>
          <div className="mt-1 text-base font-semibold text-zinc-50">{friendly}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-500 transition-colors hover:text-zinc-200"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {ticketCount > 0 && (
        <button
          type="button"
          onClick={onExpand}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Maximize2 className="h-4 w-4" />
          Expand — view all {ticketCount} ticket{ticketCount === 1 ? "" : "s"}
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Metric label="Tickets" value={bucket.total} tone="primary" />
        <Metric label="Resolved" value={bucket.resolved} tone="emerald" />
        <Metric label="Escalations" value={bucket.escalations} tone="red" />
        <Metric label="Misroutes" value={bucket.misroutes} tone="amber" />
      </div>

      <div className="flex items-center gap-2 rounded-md border border-border bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
        <Coins className="h-4 w-4 text-primary" />
        <span className="text-zinc-500">Cost</span>
        <span className="ml-auto font-medium tabular-nums text-zinc-100">{fmtCost(bucket.cost)}</span>
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">By category</div>
        <div className="space-y-2">
          {categories.map(([cat, n]) => (
            <div key={cat}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-zinc-300">{humanize(cat)}</span>
                <span className="tabular-nums text-zinc-500">{n}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(n / maxCat) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyDay({ dateKey, onClose }: { dateKey: string; onClose: () => void }) {
  const friendly = new Date(dateKey + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500">Day detail</div>
          <div className="mt-1 text-base font-semibold text-zinc-50">{friendly}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-500 transition-colors hover:text-zinc-200"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-sm text-zinc-500">No tickets on this day — a quiet one.</p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "primary" | "emerald" | "red" | "amber";
}) {
  const toneClass = {
    primary: "text-zinc-50",
    emerald: "text-emerald-300",
    red: "text-red-300",
    amber: "text-amber-300"
  }[tone];
  return (
    <div className="rounded-md border border-border bg-zinc-950 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={cn("mt-1 text-xl font-semibold tabular-nums", toneClass)}>{value}</div>
    </div>
  );
}
