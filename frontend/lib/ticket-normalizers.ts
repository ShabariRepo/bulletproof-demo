import type { DemoTicket } from "@/types/demo";

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function priorityFromSeverity(severity: string) {
  const normalized = severity.toLowerCase();
  if (["critical", "high", "p1"].includes(normalized)) return "P1";
  if (["warning", "medium", "p2"].includes(normalized)) return "P2";
  return "P3";
}

export function normalizeHaloTicket(payload: Record<string, unknown>): DemoTicket {
  const id = text(payload.id, `HALO-${Date.now()}`);
  const subject = text(payload.summary, text(payload.subject, "Imported Halo ticket"));
  const details = text(payload.details, text(payload.description, ""));
  const client = text(payload.client_name, text(payload.client, "Unknown client"));
  const category = text(payload.category, "general_support");

  return {
    id,
    type: category,
    subject,
    body: [client ? `Client: ${client}` : null, details].filter(Boolean).join("\n\n"),
    expectedRouting: "general-support",
    expectedOutcome: "Imported from Halo for Kevlar triage"
  };
}

export function normalizeNableAlert(payload: Record<string, unknown>): DemoTicket {
  const device = text(payload.deviceName, text(payload.device, "Unknown device"));
  const alert = text(payload.alertName, text(payload.title, "N-able endpoint alert"));
  const client = text(payload.customerName, text(payload.client, "Unknown client"));
  const severity = text(payload.severity, "warning");

  return {
    id: text(payload.alertId, `NABLE-${Date.now()}`),
    type: "nable_alert",
    subject: `N-ABLE: ${alert}`,
    body: [
      `N-ABLE ALERT`,
      `Severity: ${severity}`,
      `Client: ${client}`,
      `Device: ${device}`,
      `Policy: ${text(payload.policyName, "Not provided")}`,
      `Description: ${text(payload.description, "No alert description provided")}`
    ].join("\n"),
    expectedRouting: severity.toLowerCase() === "critical" ? "ESCALATION" : "general-support",
    expectedOutcome: `Create ${priorityFromSeverity(severity)} triage ticket from N-able alert`
  };
}

export function normalizeSentinelAlert(payload: Record<string, unknown>): DemoTicket {
  const alert = text(payload.title, text(payload.alertName, "Microsoft Sentinel alert"));
  const severity = text(payload.severity, "High");
  const client = text(payload.client, text(payload.customerName, "Unknown client"));

  return {
    id: text(payload.incidentId, text(payload.id, `SENTINEL-${Date.now()}`)),
    type: "sentinel_alert",
    subject: `SENTINEL: ${alert}`,
    body: [
      "SENTINEL ALERT",
      `Severity: ${severity}`,
      `Title: ${alert}`,
      `Client: ${client}`,
      `Incident URL: ${text(payload.incidentUrl, "Not provided")}`,
      `Description: ${text(payload.description, "No Sentinel description provided")}`
    ].join("\n"),
    expectedRouting: "ESCALATION",
    expectedOutcome: "Security incident - escalate to SOC and client security contact"
  };
}
