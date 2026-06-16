"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  Gauge,
  Layers,
  Loader2,
  ShieldAlert,
  Sparkles,
  XCircle,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const BURST_COUNT = 12;

type TicketState = "idle" | "fired" | "queued" | "inline-done" | "queued-done" | "error";

type TicketCell = {
  idx: number;
  state: TicketState;
  label?: string;
  category?: string;
  position?: number;
  routing?: string;
  isEscalation?: boolean;
  triageCorrect?: boolean;
};

type ScaleMoment = { type: string; from: number; to: number; util: number; at: string };

type Summary = {
  inline: number;
  queued: number;
  dropped: number;
  peakRpm: number;
  scaleEvents: ScaleMoment[];
  totalCost: number;
  totalTokens: number;
};

function fmtCost(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(value || 0);
}

export function BurstSimulation() {
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(BURST_COUNT);
  const [tickets, setTickets] = useState<TicketCell[]>([]);
  const [baseRpm, setBaseRpm] = useState(3);
  const [effectiveRpm, setEffectiveRpm] = useState(3);
  const [scalingActive, setScalingActive] = useState(false);
  const [utilization, setUtilization] = useState(0);
  const [queueDepth, setQueueDepth] = useState(0);
  const [scaleMoments, setScaleMoments] = useState<ScaleMoment[]>([]);
  const [flashScale, setFlashScale] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);

  const sourceRef = useRef<EventSource | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => sourceRef.current?.close();
  }, []);

  const run = useCallback(() => {
    if (running) return;
    sourceRef.current?.close();

    setRunning(true);
    setErrorMsg(null);
    setSummary(null);
    setDoneCount(0);
    setBaseRpm(3);
    setEffectiveRpm(3);
    setScalingActive(false);
    setUtilization(0);
    setQueueDepth(0);
    setScaleMoments([]);
    setTickets(Array.from({ length: BURST_COUNT }, (_, idx) => ({ idx, state: "idle" })));
    setCount(BURST_COUNT);

    const source = new EventSource(`/api/simulate/burst?count=${BURST_COUNT}`);
    sourceRef.current = source;

    const patch = (idx: number, fields: Partial<TicketCell>) =>
      setTickets((prev) => prev.map((t) => (t.idx === idx ? { ...t, ...fields } : t)));

    source.onmessage = (msg) => {
      let p: any;
      try {
        p = JSON.parse(msg.data);
      } catch {
        return;
      }
      switch (p.type) {
        case "error":
          setErrorMsg(p.message ?? "Burst failed.");
          setRunning(false);
          source.close();
          break;
        case "burst_start":
          setCount(p.count ?? BURST_COUNT);
          setTickets(Array.from({ length: p.count ?? BURST_COUNT }, (_, idx) => ({ idx, state: "idle" })));
          break;
        case "ticket_fired":
          patch(p.idx, { state: "fired", label: p.ticketLabel, category: p.category });
          break;
        case "ticket_queued":
          patch(p.idx, { state: "queued", position: p.position });
          break;
        case "ticket_done":
          setDoneCount((c) => c + 1);
          patch(p.idx, {
            state: p.error ? "error" : p.path === "queued" ? "queued-done" : "inline-done",
            routing: p.routing,
            isEscalation: p.isEscalation,
            triageCorrect: p.triageCorrect
          });
          break;
        case "autoscaler": {
          if (typeof p.baseRpm === "number" && p.baseRpm > 0) setBaseRpm(p.baseRpm);
          if (typeof p.effectiveRpm === "number" && p.effectiveRpm > 0) setEffectiveRpm(p.effectiveRpm);
          setScalingActive(Boolean(p.scalingActive));
          if (typeof p.utilization === "number") setUtilization(p.utilization);
          if (typeof p.queueDepth === "number") setQueueDepth(p.queueDepth);
          if (Array.isArray(p.events) && p.events.length) {
            setScaleMoments((prev) => {
              const merged = [...prev];
              for (const ev of p.events as ScaleMoment[]) {
                const key = `${ev.type}:${ev.from}:${ev.to}:${ev.at}`;
                if (!merged.some((m) => `${m.type}:${m.from}:${m.to}:${m.at}` === key)) merged.push(ev);
              }
              return merged;
            });
            if (p.events.some((e: ScaleMoment) => e.type === "scale_up")) {
              setFlashScale(true);
              if (flashTimer.current) clearTimeout(flashTimer.current);
              flashTimer.current = setTimeout(() => setFlashScale(false), 900);
            }
          }
          break;
        }
        case "burst_complete":
          setSummary({
            inline: p.inline ?? 0,
            queued: p.queued ?? 0,
            dropped: p.dropped ?? 0,
            peakRpm: p.peakRpm ?? effectiveRpm,
            scaleEvents: Array.isArray(p.scaleEvents) ? p.scaleEvents : [],
            totalCost: p.totalCost ?? 0,
            totalTokens: p.totalTokens ?? 0
          });
          setRunning(false);
          setQueueDepth(0);
          source.close();
          break;
        default:
          break;
      }
    };

    source.onerror = () => {
      setRunning((was) => {
        if (was) setErrorMsg((prev) => prev ?? "Connection to the burst run was interrupted.");
        return false;
      });
      source.close();
    };
  }, [running, effectiveRpm]);

  // Capacity meter math — base 3, climbing to effective (6, 9). Max for the
  // meter is the largest of effective or 9 (base × max_replicas).
  const meterMax = Math.max(effectiveRpm, baseRpm * 3, 9);
  const basePct = (baseRpm / meterMax) * 100;
  const effPct = (effectiveRpm / meterMax) * 100;
  const utilPct = Math.max(0, Math.min(100, Math.round((utilization > 1 ? utilization : utilization * 100))));

  const scaleUps = scaleMoments.filter((m) => m.type === "scale_up");

  return (
    <div className="space-y-6">
      {/* Control + headline */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
              {running ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
            </span>
            <div>
              <div className="text-sm font-medium text-zinc-100">Autoscaler + overflow queue burst</div>
              <div className="text-xs text-zinc-500">
                {running
                  ? `Firing ${count} concurrent tickets — watch capacity climb`
                  : summary
                  ? "Burst complete — capacity scaled, nothing dropped"
                  : `Fire ${BURST_COUNT} tickets at once — base RPM ${baseRpm}, scales to ${baseRpm * 3}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {running && (
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                <Activity className="h-4 w-4 text-amber-300" />
                <span className="tabular-nums">
                  {doneCount}/{count} done
                </span>
              </div>
            )}
            <Button
              onClick={run}
              disabled={running}
              className="min-w-[200px] bg-amber-500 text-zinc-950 hover:bg-amber-400"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Bursting…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Run burst ({BURST_COUNT} tickets)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {errorMsg && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <div className="text-sm font-medium text-red-200">Burst failed</div>
              <p className="mt-1 text-sm leading-6 text-red-200/80">{errorMsg}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Capacity meter */}
        <Card className={cn(flashScale && "burst-scale-flash")}>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                <Gauge className="h-3.5 w-3.5" />
                Effective capacity (RPM)
              </div>
              {scalingActive ? (
                <Badge variant="default" className="gap-1 bg-emerald-500 text-zinc-950">
                  <Zap className="h-3 w-3" />
                  Scaled up
                </Badge>
              ) : (
                <Badge variant="outline">Base capacity</Badge>
              )}
            </div>

            {/* Big numbers */}
            <div className="mb-5 flex items-end gap-3">
              <span className="text-5xl font-semibold tabular-nums text-zinc-50">{effectiveRpm}</span>
              <span className="pb-1.5 text-sm text-zinc-500">
                effective RPM
                <span className="ml-2 text-zinc-600">· base {baseRpm}</span>
              </span>
            </div>

            {/* Meter bar — effective fill (amber→emerald when scaled) over a base marker */}
            <div className="relative h-8 w-full overflow-hidden rounded-md border border-border bg-zinc-950">
              <div
                className={cn(
                  "burst-meter-fill absolute inset-y-0 left-0 rounded-md",
                  scalingActive ? "bg-emerald-500/40" : "bg-amber-500/40"
                )}
                style={{ width: `${effPct}%` }}
              />
              {/* base capacity marker */}
              <div
                className="absolute inset-y-0 w-px bg-zinc-100/60"
                style={{ left: `${basePct}%` }}
                title={`Base RPM ${baseRpm}`}
              />
              <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px] font-medium text-zinc-300">
                <span>base {baseRpm}</span>
                <span>cap {baseRpm * 3}</span>
              </div>
            </div>

            {/* RPM ladder */}
            <div className="mt-4 flex items-center gap-2">
              {[baseRpm, baseRpm * 2, baseRpm * 3].map((step) => {
                const reached = effectiveRpm >= step;
                return (
                  <div
                    key={step}
                    className={cn(
                      "flex flex-1 items-center justify-center rounded-md border py-2 text-sm font-medium transition-colors",
                      reached
                        ? step === baseRpm
                          ? "border-zinc-600 bg-zinc-800/50 text-zinc-200"
                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-border bg-zinc-950 text-zinc-600"
                    )}
                  >
                    {step} RPM
                  </div>
                );
              })}
            </div>

            {/* Scale-up annotations */}
            {scaleUps.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {scaleUps.map((m, i) => (
                  <span
                    key={`${m.from}-${m.to}-${m.at}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 sim-pop"
                  >
                    <Zap className="h-3 w-3" />
                    scaled {m.from}→{m.to}
                  </span>
                ))}
              </div>
            )}

            {/* Utilization */}
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-500">
                <span>Utilization</span>
                <span className="tabular-nums">{utilPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    utilPct >= 50 ? "bg-amber-400" : "bg-primary"
                  )}
                  style={{ width: `${utilPct}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue depth */}
        <Card>
          <CardContent className="flex h-full flex-col p-6">
            <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              <Layers className="h-3.5 w-3.5" />
              Overflow queue
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div
                className={cn(
                  "flex h-24 w-24 items-center justify-center rounded-full border-2 transition-colors",
                  queueDepth > 0
                    ? "burst-queue-pulse border-amber-500/50 bg-amber-500/10 text-amber-300"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                )}
              >
                <span className="text-3xl font-semibold tabular-nums">{queueDepth}</span>
              </div>
              <div className="text-center text-xs text-zinc-500">
                {queueDepth > 0 ? "tickets held & draining" : "queue clear — nothing dropped"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ticket swarm */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Ticket swarm</div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-500">
              <LegendDot className="bg-primary/40" label="inline" />
              <LegendDot className="bg-amber-400/50" label="queued" />
              <LegendDot className="bg-emerald-500/50" label="done" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12">
            {tickets.map((t) => (
              <TicketChip key={t.idx} cell={t} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Final summary */}
      {summary && (
        <Card className="sim-rise border-emerald-500/30 bg-emerald-500/[0.04]">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Burst absorbed — {summary.dropped === 0 ? "0 dropped" : `${summary.dropped} dropped`}
              </span>
              {summary.scaleEvents.filter((e) => e.type === "scale_up").length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
                  <Zap className="h-4 w-4" />
                  scaled {baseRpm}→{summary.peakRpm || baseRpm * 3}
                </span>
              )}
            </div>

            <p className="text-sm leading-7 text-zinc-300">
              <span className="font-semibold text-emerald-300">{summary.inline}</span> ran inline ·{" "}
              <span className="font-semibold text-amber-300">{summary.queued}</span> queued + drained ·{" "}
              <span className="font-semibold text-emerald-300">{summary.dropped} dropped</span> · scaled {baseRpm}→
              {summary.peakRpm || baseRpm * 3} · {fmtCost(summary.totalCost)} ·{" "}
              {summary.totalTokens.toLocaleString()} tokens
            </p>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryStat label="Ran inline" value={String(summary.inline)} tone="emerald" />
              <SummaryStat label="Queued + drained" value={String(summary.queued)} tone="amber" />
              <SummaryStat label="Dropped" value={String(summary.dropped)} tone={summary.dropped ? "amber" : "emerald"} />
              <SummaryStat label="Peak RPM" value={String(summary.peakRpm || baseRpm * 3)} tone="emerald" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TicketChip({ cell }: { cell: TicketCell }) {
  const { state } = cell;
  const base =
    "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-center transition-colors";

  if (state === "idle") {
    return <div className={cn(base, "border-dashed border-border bg-zinc-950/50 text-zinc-700")} />;
  }
  if (state === "fired") {
    return (
      <div className={cn(base, "burst-fire sim-pulse-ring border-primary/50 bg-primary/10 text-primary")}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }
  if (state === "queued") {
    return (
      <div className={cn(base, "burst-queue-pulse border-amber-500/50 bg-amber-500/10 text-amber-300")}>
        <Layers className="h-4 w-4" />
        <span className="mt-0.5 text-[10px] font-medium">#{cell.position ?? "?"}</span>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className={cn(base, "border-red-500/40 bg-red-500/10 text-red-300")}>
        <XCircle className="h-4 w-4" />
      </div>
    );
  }
  // done (inline or queued)
  const escalated = cell.isEscalation;
  const correct = cell.triageCorrect;
  const wasQueued = state === "queued-done";
  return (
    <div
      className={cn(
        base,
        "sim-pop",
        escalated
          ? "border-red-500/40 bg-red-500/10 text-red-300"
          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      )}
      title={`${cell.label ?? ""} → ${cell.routing ?? ""}${wasQueued ? " (queued)" : ""}`}
    >
      {escalated ? <ShieldAlert className="h-4 w-4" /> : <Check className="h-4 w-4" />}
      <div className="mt-0.5 flex items-center gap-0.5">
        {wasQueued && <Layers className="h-2.5 w-2.5 text-amber-300/80" />}
        {!correct && !escalated && <AlertTriangle className="h-2.5 w-2.5 text-amber-300/80" />}
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", className)} />
      {label}
    </span>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone: "emerald" | "amber" }) {
  return (
    <div className="rounded-md border border-border bg-zinc-950 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums",
          tone === "emerald" ? "text-emerald-300" : "text-amber-300"
        )}
      >
        {value}
      </div>
    </div>
  );
}
