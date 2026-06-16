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
