"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  CircleDashed,
  Coins,
  Cpu,
  FileCheck2,
  Gauge,
  Inbox,
  Loader2,
  Play,
  Route as RouteIcon,
  ShieldAlert,
  Sparkles,
  Timer,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StageKey =
  | "intake"
  | "triage"
  | "classify"
  | "route"
  | "specialist"
  | "resolve"
  | "logged";

type StageState = "pending" | "active" | "done";

type Ticket = {
  id: string;
  subject: string;
  body: string;
  category: string;
  expectedRouting: string;
};

type RunData = {
  ticket?: Ticket;
  classification?: string;
  severity?: string;
  confidence?: number;
  routing?: string;
  routingLabel?: string;
  isEscalation?: boolean;
  specialistLabel?: string;
  kb?: string;
  snippet?: string;
  resolution?: string;
  triageCorrect?: boolean;
  resolved?: boolean;
  model?: string;
  tokens?: number;
  cost?: number;
  elapsedSeconds?: number;
};

const STAGES: { key: StageKey; label: string; icon: typeof Inbox; hint: string }[] = [
  { key: "intake", label: "Intake", icon: Inbox, hint: "Ticket created" },
  { key: "triage", label: "Triage", icon: Bot, hint: "Router thinking" },
  { key: "classify", label: "Classify", icon: Gauge, hint: "Category + severity" },
  { key: "route", label: "Route", icon: RouteIcon, hint: "Specialist decision" },
  { key: "specialist", label: "Specialist + KB", icon: BookOpen, hint: "Grounded answer" },
  { key: "resolve", label: "Resolve", icon: FileCheck2, hint: "Resolution drafted" },
  { key: "logged", label: "Logged", icon: CheckCircle2, hint: "Added to history" }
];

// Map an SSE stage name → the pipeline stage it advances to "active".
const SSE_TO_STAGE: Record<string, StageKey> = {
  intake: "intake",
  triage_start: "triage",
  classified: "classify",
  routed: "route",
  specialist: "specialist",
  resolved: "resolve",
  evaluated: "resolve",
  complete: "logged"
};

const STAGE_ORDER = STAGES.map((s) => s.key);

function fmtCost(value?: number) {
  if (typeof value !== "number") return "$0.0000";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(value);
}

function humanize(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function LiveSimulation({ recentCount }: { recentCount: number }) {
  const [running, setRunning] = useState(false);
  const [stageStates, setStageStates] = useState<Record<StageKey, StageState>>(() =>
    Object.fromEntries(STAGES.map((s) => [s.key, "pending"])) as Record<StageKey, StageState>
  );
  const [data, setData] = useState<RunData>({});
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [toast, setToast] = useState(false);

  const sourceRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      sourceRef.current?.close();
      clearTimer();
    };
  }, []);

  const advanceTo = useCallback((target: StageKey) => {
    setStageStates((prev) => {
      const next = { ...prev };
      const targetIdx = STAGE_ORDER.indexOf(target);
      STAGE_ORDER.forEach((key, idx) => {
        if (idx < targetIdx) next[key] = "done";
        else if (idx === targetIdx) next[key] = "active";
      });
      return next;
    });
  }, []);

  const markDone = useCallback((key: StageKey) => {
    setStageStates((prev) => ({ ...prev, [key]: "done" }));
  }, []);

  const run = useCallback(() => {
    if (running) return;
    // reset
    sourceRef.current?.close();
    clearTimer();
    setRunning(true);
    setCompleted(false);
    setErrorMsg(null);
    setToast(false);
    setData({});
    setElapsed(0);
    setStageStates(Object.fromEntries(STAGES.map((s) => [s.key, "pending"])) as Record<StageKey, StageState>);

    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed((Date.now() - start) / 1000), 100);

    const source = new EventSource("/api/simulate");
    sourceRef.current = source;

    source.onmessage = (msg) => {
      let payload: any;
      try {
        payload = JSON.parse(msg.data);
      } catch {
        return;
      }
      const stage: string = payload.stage;

      if (stage === "error") {
        setErrorMsg(payload.message ?? "Live simulation failed.");
        setRunning(false);
        clearTimer();
        source.close();
        return;
      }

      // Advance the visual pipeline.
      const mapped = SSE_TO_STAGE[stage];
      if (mapped) advanceTo(mapped);

      switch (stage) {
        case "intake":
          setData((d) => ({ ...d, ticket: payload.ticket }));
          markDone("intake");
          break;
        case "triage_start":
          // triage stays "active" (the long real wait) — pulsing ring shows.
          markDone("intake");
          break;
        case "classified":
          markDone("triage");
          setData((d) => ({
            ...d,
            classification: payload.classification,
            severity: payload.severity,
            confidence: payload.confidence
          }));
          markDone("classify");
          break;
        case "routed":
          setData((d) => ({
            ...d,
            routing: payload.routing,
            routingLabel: payload.routingLabel,
            isEscalation: payload.isEscalation
          }));
          markDone("route");
          break;
        case "specialist":
          setData((d) => ({
            ...d,
            specialistLabel: payload.specialistLabel,
            kb: payload.kb,
            snippet: payload.snippet,
            isEscalation: payload.isEscalation
          }));
          markDone("specialist");
          break;
        case "resolved":
          setData((d) => ({ ...d, resolution: payload.resolution }));
          break;
        case "evaluated":
          setData((d) => ({ ...d, triageCorrect: payload.triageCorrect, resolved: payload.resolved }));
          markDone("resolve");
          break;
        case "complete": {
          const r = payload.run ?? {};
          setData((d) => ({
            ...d,
            model: r.model,
            tokens: r.tokens,
            cost: r.cost,
            elapsedSeconds: r.elapsedSeconds,
            triageCorrect: r.triageCorrect,
            resolved: r.resolved
          }));
          markDone("logged");
          setRunning(false);
          setCompleted(true);
          setToast(true);
          clearTimer();
          source.close();
          setTimeout(() => setToast(false), 5000);
          break;
        }
        default:
          break;
      }
    };

    source.onerror = () => {
      // Only surface an error if we never completed.
      setRunning((wasRunning) => {
        if (wasRunning) {
          setErrorMsg((prev) => prev ?? "Connection to the live run was interrupted.");
        }
        return false;
      });
      clearTimer();
      source.close();
    };
  }, [running, advanceTo, markDone]);

  const elapsedLabel = `${elapsed.toFixed(1)}s`;

  return (
    <div className="space-y-6">
      {/* Control bar */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
              {running ? <Sparkles className="h-5 w-5 animate-pulse" /> : <Play className="h-5 w-5" />}
            </span>
            <div>
              <div className="text-sm font-medium text-zinc-100">Real Bonito triage flow</div>
              <div className="text-xs text-zinc-500">
                {running
                  ? "Run in flight — every value is live"
                  : completed
                  ? "Run complete — press to run another"
                  : `${recentCount} run${recentCount === 1 ? "" : "s"} in history`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(running || completed) && (
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                <Timer className="h-4 w-4 text-primary" />
                <span className="tabular-nums">{elapsedLabel}</span>
              </div>
            )}
            <Button onClick={run} disabled={running} className="min-w-[170px]">
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run a live ticket
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error card */}
      {errorMsg && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <div className="text-sm font-medium text-red-200">Live run failed</div>
              <p className="mt-1 text-sm leading-6 text-red-200/80">{errorMsg}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Stage pipeline */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Flow</div>
            <ol className="relative">
              {STAGES.map((stage, idx) => {
                const state = stageStates[stage.key];
                const isLast = idx === STAGES.length - 1;
                return (
                  <li key={stage.key} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* connector */}
                    {!isLast && (
                      <span className="absolute left-[19px] top-10 h-[calc(100%-1.5rem)] w-px bg-border">
                        <span
                          className="sim-connector-fill absolute left-0 top-0 block w-px bg-primary"
                          style={{ height: state === "done" ? "100%" : "0%" }}
                        />
                      </span>
                    )}
                    {/* node */}
                    <span
                      className={cn(
                        "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                        state === "pending" && "border-border bg-zinc-950 text-zinc-600",
                        state === "active" && "sim-pulse-ring border-primary bg-primary/15 text-primary",
                        state === "done" && "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                      )}
                      aria-live={state === "active" ? "polite" : undefined}
                    >
                      {state === "done" ? (
                        <Check className="h-4 w-4 sim-pop" />
                      ) : state === "active" ? (
                        <stage.icon className="h-4 w-4" />
                      ) : (
                        <CircleDashed className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <div
                        className={cn(
                          "text-sm font-medium transition-colors",
                          state === "pending" && "text-zinc-600",
                          state === "active" && "text-primary",
                          state === "done" && "text-zinc-100"
                        )}
                      >
                        {stage.label}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {state === "active" && stage.key === "triage" ? "Thinking… (real agent call)" : stage.hint}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {/* Artifacts */}
        <div className="space-y-5">
          {/* Ticket card */}
          {data.ticket ? (
            <Card className="sim-rise">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Inbox className="h-4 w-4 text-primary" />
                    <span className="font-mono text-xs text-zinc-400">{data.ticket.id}</span>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      {humanize(data.ticket.category)}
                    </Badge>
                  </div>
                  <span className="text-xs text-zinc-500">expects {data.ticket.expectedRouting}</span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-zinc-50">{data.ticket.subject}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{data.ticket.body}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Sparkles className="h-6 w-6 text-zinc-600" />
                <p className="text-sm text-zinc-500">
                  Press <span className="text-zinc-300">Run a live ticket</span> to generate a random Tier-1 ticket and
                  watch the real agent flow.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Classification chips */}
          {data.classification && (
            <Card className="sim-rise">
              <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
                <Chip label="Classification" value={humanize(data.classification)} />
                <Chip label="Severity" value={(data.severity ?? "—").toUpperCase()} />
                <ConfidenceChip confidence={data.confidence ?? 0} />
              </CardContent>
            </Card>
          )}

          {/* Routing decision */}
          {data.routing && (
            <Card className="sim-rise">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                <div className="flex items-center gap-3">
                  <RouteIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm text-zinc-400">Routed to</span>
                  {data.isEscalation ? (
                    <Badge variant="escalated" className="gap-1 sim-pop">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      ESCALATED
                    </Badge>
                  ) : (
                    <Badge variant="default" className="sim-pop">
                      {data.routingLabel ?? data.routing}
                    </Badge>
                  )}
                </div>
                {data.kb && (
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <BookOpen className="h-4 w-4 text-zinc-500" />
                    grounded in <span className="text-zinc-200">{data.kb}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Specialist snippet */}
          {data.snippet && (
            <Card className="sim-rise">
              <CardContent className="p-6">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                  <Bot className="h-3.5 w-3.5" />
                  {data.specialistLabel ?? "Specialist"} — first look
                </div>
                <p className="text-sm leading-6 text-zinc-300">{data.snippet}</p>
              </CardContent>
            </Card>
          )}

          {/* Resolution */}
          {data.resolution && (
            <Card className="sim-rise border-emerald-500/20">
              <CardContent className="p-6">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-emerald-300/80">
                  <FileCheck2 className="h-3.5 w-3.5" />
                  Resolution
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{data.resolution}</p>
              </CardContent>
            </Card>
          )}

          {/* Completion summary */}
          {completed && (
            <Card className="sim-rise">
              <CardContent className="space-y-5 p-6">
                <div className="flex flex-wrap items-center gap-3">
                  {data.triageCorrect ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      Triage correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-300">
                      <XCircle className="h-4 w-4" />
                      Misroute vs expected
                    </span>
                  )}
                  {data.resolved ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
                      <Check className="h-4 w-4" />
                      Resolved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-300">
                      <AlertTriangle className="h-4 w-4" />
                      Needs review
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat icon={Cpu} label="Model" value={data.model ?? "—"} />
                  <Stat icon={Sparkles} label="Tokens" value={(data.tokens ?? 0).toLocaleString()} />
                  <Stat icon={Coins} label="Cost" value={fmtCost(data.cost)} />
                  <Stat icon={Timer} label="Elapsed" value={`${(data.elapsedSeconds ?? 0).toFixed(1)}s`} />
                </div>

                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                >
                  Added to test history
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 sim-rise">
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-zinc-900 px-4 py-3 shadow-xl">
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            <div className="text-sm text-zinc-200">
              Run logged to test history
              <Link href="/" className="ml-2 text-primary hover:underline">
                View →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-zinc-950 p-3 sim-pop">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-zinc-100">{value}</div>
    </div>
  );
}

function ConfidenceChip({ confidence }: { confidence: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(confidence > 1 ? confidence : confidence * 100)));
  return (
    <div className="rounded-md border border-border bg-zinc-950 p-3 sim-pop">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Confidence</span>
        <span className="text-sm font-medium text-zinc-100">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-zinc-950 p-3">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-medium text-zinc-100" title={value}>
        {value}
      </div>
    </div>
  );
}
