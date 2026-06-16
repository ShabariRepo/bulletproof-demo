#!/usr/bin/env node
// Backfill frontend/data/live-runs.json with ~30 days of realistic LiveRun
// history so /calendar renders with busy AND quiet days and the dashboard has
// a populated queue.
//
// Pure Node (fs only) — NO deps. node_modules is a symlink to another repo, so
// this script must not import anything.
//
// Re-runnable: regenerates ONLY the `seed-` prefixed records and PRESERVES any
// real (non-`seed-`) runs already in the file. Run with:  node scripts/seed-history.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "data", "live-runs.json");

// ---- ticket category catalog (mirrors lib/sim-tickets.ts) -----------------
const CATEGORIES = [
  {
    category: "password_account",
    classification: "password_account",
    routing: "password-specialist",
    subjects: [
      "Can't log in — password expired over the weekend",
      "Account locked after too many attempts",
      "New phone, MFA codes not working",
      "Password reset link not arriving"
    ]
  },
  {
    category: "connectivity_vpn",
    classification: "connectivity_vpn",
    routing: "connectivity-specialist",
    subjects: [
      "VPN won't connect — error 443",
      "New employee needs VPN access",
      "WiFi keeps dropping in the branch office",
      "Remote desktop drops every few minutes"
    ]
  },
  {
    category: "software_provisioning",
    classification: "software_provisioning",
    routing: "software-specialist",
    subjects: [
      "Need Slack installed",
      "Can I install uTorrent?",
      "License request for design software",
      "Adobe Acrobat install request"
    ]
  },
  {
    category: "hardware_general",
    classification: "hardware_general",
    routing: "general-support",
    subjects: [
      "Laptop won't power on after update",
      "Monitor flickering and going black",
      "Keyboard keys sticking on ThinkPad",
      "Docking station not detecting displays"
    ]
  },
  {
    category: "escalation",
    classification: "security_alert",
    routing: "ESCALATION",
    subjects: [
      "Suspicious login alert from another country",
      "Entire office can't reach email or shared drives",
      "CEO laptop encrypted by ransomware note",
      "Possible phishing campaign hitting finance"
    ]
  }
];

const SEVERITY_BY_ROUTING = {
  ESCALATION: ["P1", "P1", "P2"],
  default: ["P2", "P3", "P2", "P3"]
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// Weighted category pick: escalations are rarer than routine tickets.
function pickCategory() {
  const r = Math.random();
  if (r < 0.1) return CATEGORIES[4]; // escalation ~10%
  // remaining 90% spread across the 4 routine categories
  return pick(CATEGORIES.slice(0, 4));
}

let seq = 1000;
function makeRun(date) {
  const cat = pickCategory();
  const isEscalation = cat.routing === "ESCALATION";

  // ~90% triage-correct: occasionally the routing differs from expected.
  const triageCorrect = Math.random() < 0.9;
  let routing = cat.routing;
  if (!triageCorrect) {
    // misroute to a different specialist (never to the expected one)
    const others = CATEGORIES.filter((c) => c.routing !== cat.routing).map((c) => c.routing);
    routing = pick(others);
  }

  // resolved ~80% (escalations count as resolved/handled less often)
  const resolved = isEscalation ? Math.random() < 0.7 : Math.random() < 0.85;

  const sevPool = isEscalation ? SEVERITY_BY_ROUTING.ESCALATION : SEVERITY_BY_ROUTING.default;

  // Timestamp: spread across business hours (8:00–18:00) of the given day.
  const ts = new Date(date);
  ts.setHours(randInt(8, 18), randInt(0, 59), randInt(0, 59), randInt(0, 999));

  seq += 1;
  const idNum = String(randInt(10000, 99999));
  const id = `SIM-${idNum}`;

  return {
    runId: `seed-${idNum}-${ts.getTime()}-${seq}`,
    timestamp: ts.toISOString(),
    ticketLabel: id,
    subject: pick(cat.subjects),
    category: cat.category,
    classification: cat.classification,
    severity: pick(sevPool),
    confidence: randInt(82, 100),
    routing,
    expectedRouting: cat.routing,
    triageCorrect,
    resolved,
    model: "gpt-4o-mini-2024-07-18",
    tokens: randInt(9000, 16000),
    cost: Math.round(randFloat(0.0011, 0.0019) * 1e7) / 1e7,
    elapsedSeconds: Math.round(randFloat(15, 40) * 10) / 10
  };
}

// ---- volume distribution per day ------------------------------------------
// weekdays busy (8–16), weekends quiet (0–3), a couple zero days, a couple spike
// days (20+). Returns the # of tickets for a given Date.
function volumeFor(date, dayIndex, totalDays) {
  const dow = date.getDay(); // 0=Sun, 6=Sat
  const isWeekend = dow === 0 || dow === 6;

  // designate two spike days (busy weekdays) and two zero days deterministically
  // by position so the seeded month always shows clear contrast.
  return { isWeekend, dow };
}

function buildDays() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const DAYS = 30;
  const days = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }

  // Pick spike + zero days among weekdays (avoid the most recent 2 days so the
  // dashboard "recent" list looks normal).
  const weekdayIdx = [];
  days.forEach((d, idx) => {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6 && idx < DAYS - 2) weekdayIdx.push(idx);
  });
  // shuffle-lite
  weekdayIdx.sort(() => Math.random() - 0.5);
  const spikeDays = new Set(weekdayIdx.slice(0, 2));
  const zeroDays = new Set(weekdayIdx.slice(2, 4));

  const runs = [];
  days.forEach((d, idx) => {
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;

    let count;
    if (zeroDays.has(idx)) count = 0;
    else if (spikeDays.has(idx)) count = randInt(20, 28);
    else if (isWeekend) count = randInt(0, 3);
    else count = randInt(8, 16);

    for (let k = 0; k < count; k++) {
      runs.push(makeRun(d));
    }
  });

  return runs;
}

function main() {
  let existing = [];
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) existing = parsed;
  } catch {
    // no file yet — fine
  }

  // Preserve real (non-seed) runs; drop old seed records.
  const realRuns = existing.filter((r) => !(typeof r.runId === "string" && r.runId.startsWith("seed-")));

  const seeded = buildDays();
  const merged = [...realRuns, ...seeded];

  // sort chronologically so the dashboard reverse() shows newest first.
  merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2), "utf8");

  console.log(
    `Seeded ${seeded.length} runs across 30 days (preserved ${realRuns.length} real runs). Total: ${merged.length}.`
  );
}

main();
