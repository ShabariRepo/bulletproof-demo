import fs from "node:fs";
import path from "node:path";

// File-based persistence for completed Live Simulation runs.
//
// NOTE: this writes to local disk (frontend/data/live-runs.json). That is fine
// for this local demo, but it will NOT persist on a read-only serverless
// filesystem (e.g. Vercel) — a future swap to a real DB (Postgres/SQLite) is
// the productionization path. Reads tolerate a missing dir/file (ENOENT → []).

export type LiveRun = {
  runId: string;
  timestamp: string; // ISO
  ticketLabel: string;
  subject: string;
  category: string;
  classification: string;
  severity: string;
  confidence: number;
  routing: string;
  expectedRouting: string;
  triageCorrect: boolean;
  resolved: boolean;
  model: string;
  tokens: number;
  cost: number;
  elapsedSeconds: number;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "live-runs.json");

export function readLiveRuns(): LiveRun[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LiveRun[]) : [];
  } catch (err) {
    // ENOENT (no file yet) or malformed JSON → empty history.
    return [];
  }
}

export function appendLiveRun(run: LiveRun): LiveRun[] {
  const runs = readLiveRuns();
  runs.push(run);
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(runs, null, 2), "utf8");
  } catch (err) {
    // Read-only FS (serverless) — keep the run in-memory for this response but
    // don't crash the request. Future: persist to a DB instead.
  }
  return runs;
}

// ---- Calendar aggregation -------------------------------------------------
// One bucket per calendar day (local date), with the counts the node-calendar
// needs to render "busy vs quiet" days and a per-day breakdown.

export type DayBucket = {
  date: string; // YYYY-MM-DD (local)
  total: number;
  escalations: number;
  misroutes: number;
  resolved: number;
  byCategory: Record<string, number>;
  cost: number;
};

/**
 * Local Y-M-D key for a run's timestamp. EXPORTED so both the aggregate
 * grouping (`readRunsByDay`) and the raw per-day grouping (`readRunsByDayList`,
 * used by the calendar's Expand modal) share one key implementation and can't
 * drift apart.
 */
export function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Group all stored runs by local calendar day. */
export function readRunsByDay(): Record<string, DayBucket> {
  const buckets: Record<string, DayBucket> = {};
  for (const r of readLiveRuns()) {
    if (!r.timestamp) continue;
    const key = localDateKey(r.timestamp);
    const b =
      buckets[key] ??
      (buckets[key] = {
        date: key,
        total: 0,
        escalations: 0,
        misroutes: 0,
        resolved: 0,
        byCategory: {},
        cost: 0,
      });
    b.total += 1;
    if ((r.routing || "").toUpperCase() === "ESCALATION") b.escalations += 1;
    if (!r.triageCorrect) b.misroutes += 1;
    if (r.resolved) b.resolved += 1;
    b.byCategory[r.category] = (b.byCategory[r.category] ?? 0) + 1;
    b.cost += Number(r.cost) || 0;
  }
  return buckets;
}

/**
 * Group the raw runs by the SAME local-date key as `readRunsByDay`, so the
 * calendar can hand each day node its individual tickets (for the Expand modal)
 * alongside the aggregate bucket. Aggregates intentionally drop per-ticket
 * detail; this preserves it.
 */
export function readRunsByDayList(): Record<string, LiveRun[]> {
  const byDay: Record<string, LiveRun[]> = {};
  for (const r of readLiveRuns()) {
    if (!r.timestamp) continue;
    const key = localDateKey(r.timestamp);
    (byDay[key] ??= []).push(r);
  }
  return byDay;
}
