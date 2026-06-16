import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import type {
  AgentProfile,
  Citation,
  DashboardMetrics,
  DemoTicket,
  KnowledgeBase,
  RunResult,
  SpecialistResponse,
  TicketStatus,
  TicketView,
  TraceStep
} from "@/types/demo";

const repoRoot = path.resolve(process.cwd(), "..");

const agentNames: Record<string, string> = {
  "triage-router": "Triage Router",
  "password-specialist": "Password & Account Specialist",
  "connectivity-specialist": "Connectivity & VPN Specialist",
  "software-specialist": "Software & Provisioning Specialist",
  "general-support": "General Support"
};

const specialistNames: Record<string, string> = {
  password: "Password & Account Specialist",
  connectivity: "Connectivity & VPN Specialist",
  software: "Software & Provisioning Specialist",
  general: "General Support",
  "password-specialist": "Password & Account Specialist",
  "connectivity-specialist": "Connectivity & VPN Specialist",
  "software-specialist": "Software & Provisioning Specialist",
  "general-support": "General Support",
  ESCALATION: "Human escalation"
};

const categoryKb: Record<string, string> = {
  password_account: "password-procedures",
  connectivity_vpn: "vpn-procedures",
  software_provisioning: "approved-software",
  hardware_general: "client-directory",
  security_alert: "escalation-matrix",
  escalation: "escalation-matrix"
};

const agentKbAttachments: Record<string, string[]> = {
  "triage-router": ["client-directory", "escalation-matrix"],
  "password-specialist": ["password-procedures", "client-directory", "escalation-matrix"],
  "connectivity-specialist": ["vpn-procedures", "client-directory", "escalation-matrix"],
  "software-specialist": ["approved-software", "client-directory", "escalation-matrix"],
  "general-support": ["client-directory", "escalation-matrix"]
};

function readText(...segments: string[]) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

function fileExists(...segments: string[]) {
  return fs.existsSync(path.join(repoRoot, ...segments));
}

function titleFromMarkdown(markdown: string, fallback: string) {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading?.[1] ?? fallback;
}

function humanize(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseCost(value: string | number | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Number.parseFloat(value) || 0;
}

function getSpecialistResponse(result: RunResult | null) {
  return result?.parsed?.specialist_response ?? null;
}

function getSpecialistResolution(response: SpecialistResponse | string | null) {
  if (!response || typeof response === "string") return null;
  return response.resolution ?? null;
}

function getStatus(result: RunResult | null): TicketStatus {
  if (!result) return "queued";
  const action = result.parsed?.action;
  const resolution = getSpecialistResolution(getSpecialistResponse(result));
  if (action === "escalate" || result.actual_routing === "ESCALATION" || resolution === "escalated") {
    return "escalated";
  }
  if (resolution === "pending") return "in-progress";
  if (result.actual_routing) return "resolved";
  return "queued";
}

function getRequester(ticket: DemoTicket) {
  const firstLine = ticket.body
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return "Unknown requester";
  return firstLine.replace(/^Hi,\s*/i, "").replace(/\.$/, "");
}

function getAssignedSpecialist(result: RunResult | null, ticket: DemoTicket) {
  if (!result) return specialistNames[ticket.expectedRouting] ?? humanize(ticket.expectedRouting);
  if (result.actual_routing === "ESCALATION") return "Human escalation";
  const specialist = result.parsed?.specialist ?? result.actual_routing;
  return specialistNames[specialist ?? ""] ?? humanize(result.actual_routing);
}

function stripYamlQuotes(value: string) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseDemoTickets(markdown: string): DemoTicket[] {
  return markdown
    .split(/\n\s{2}- id:\s+/)
    .slice(1)
    .map((block) => {
      const [idLine] = block.split("\n", 1);
      const field = (name: string) => {
        const match = block.match(new RegExp(`\\n    ${name}:\\s*(.+)`));
        return stripYamlQuotes(match?.[1] ?? "");
      };
      const bodyMatch = block.match(/\n    body: \|\n([\s\S]*?)\n    expected_routing:/);
      const body = (bodyMatch?.[1] ?? "")
        .split("\n")
        .map((line) => line.replace(/^      /, ""))
        .join("\n")
        .trim();

      return {
        id: idLine.trim(),
        type: field("type"),
        subject: field("subject"),
        body,
        expectedRouting: field("expected_routing"),
        expectedOutcome: field("expected_outcome")
      };
    });
}

export const getTickets = cache((): DemoTicket[] => {
  return parseDemoTickets(readText("tickets", "demo-tickets.yaml"));
});

export const getRunResults = cache((): RunResult[] => {
  if (!fileExists("results.json")) return [];
  return JSON.parse(readText("results.json")) as RunResult[];
});

export const getKnowledgeBases = cache((): KnowledgeBase[] => {
  const dir = path.join(repoRoot, "knowledge-bases");
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((filename) => {
      const markdown = readText("knowledge-bases", filename);
      const slug = filename.replace(/\.md$/, "");
      return {
        slug,
        title: titleFromMarkdown(markdown, humanize(slug)),
        filename,
        markdown,
        excerpt: markdown
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith("#"))
          .slice(0, 3)
          .join(" ")
      };
    });
});

export const getAgentProfiles = cache((): AgentProfile[] => {
  const results = getRunResults();
  const model = results.find((result) => result.model_used)?.model_used ?? "gpt-4o-mini";
  return Object.keys(agentNames).map((slug) => {
    const promptPath = path.join(repoRoot, "agents", slug, "system-prompt.md");
    return {
      slug,
      name: agentNames[slug],
      model,
      prompt: fs.existsSync(promptPath) ? fs.readFileSync(promptPath, "utf8") : "",
      attachments: agentKbAttachments[slug] ?? []
    };
  });
});

function selectChunk(markdown: string, hints: string[]) {
  const sections = markdown.split(/\n(?=##\s+)/g);
  const normalizedHints = hints.filter(Boolean).map((hint) => hint.toLowerCase());
  const section =
    sections.find((candidate) => {
      const lower = candidate.toLowerCase();
      return normalizedHints.some((hint) => lower.includes(hint));
    }) ?? sections[0] ?? markdown;
  const title = section.match(/^#{1,3}\s+(.+)$/m)?.[1] ?? "Knowledge base chunk";
  const excerpt = section
    .split("\n")
    .filter((line) => line.trim())
    .slice(0, 7)
    .join("\n");
  return { title, excerpt };
}

function buildCitations(ticket: DemoTicket, result: RunResult | null, knowledgeBases: KnowledgeBase[]): Citation[] {
  const classification = result?.parsed?.classification ?? result?.classification ?? ticket.type;
  const kbSlugs = new Set(["client-directory", "escalation-matrix"]);
  const categoryMatch = categoryKb[classification];
  if (categoryMatch) kbSlugs.add(categoryMatch);
  const client = result?.parsed?.client_identified ?? "";
  const hints = [client, ticket.subject, ticket.type, classification];
  return Array.from(kbSlugs)
    .map((slug, index) => {
      const kb = knowledgeBases.find((entry) => entry.slug === slug);
      if (!kb) return null;
      const chunk = selectChunk(kb.markdown, hints);
      return {
        kbSlug: kb.slug,
        kbTitle: kb.title,
        chunkTitle: chunk.title,
        excerpt: chunk.excerpt,
        score: Number((0.91 - index * 0.04).toFixed(2))
      };
    })
    .filter((citation): citation is Citation => Boolean(citation));
}

function responseText(response: SpecialistResponse | string | null) {
  if (!response) return "No specialist response was returned for this ticket.";
  if (typeof response === "string") return response;
  const lines = [
    response.resolution ? `Resolution: ${response.resolution}` : null,
    response.procedure_used ? `Procedure used: ${response.procedure_used}` : null,
    response.steps_taken?.length ? response.steps_taken.join("\n") : null,
    response.follow_up_needed ? `Follow up: ${response.follow_up_needed}` : null,
    response.escalation_reason ? `Escalation reason: ${response.escalation_reason}` : null
  ];
  return lines.filter(Boolean).join("\n");
}

function buildTrace(ticket: DemoTicket, result: RunResult | null, citations: Citation[]): TraceStep[] {
  const parsed = result?.parsed;
  const routeLabel = parsed?.action === "escalate" ? "Escalation decision" : "Delegation decision";
  const specialist = getAssignedSpecialist(result, ticket);
  return [
    {
      id: `${ticket.id}-ingest`,
      label: "Ticket intake",
      detail: ticket.subject,
      meta: `${ticket.id} received from Halo intake`
    },
    {
      id: `${ticket.id}-triage`,
      label: "Triage Router",
      detail: parsed?.reasoning ?? "Classified and routed from the local run result.",
      meta: `${parsed?.classification ?? result?.classification ?? ticket.type} - ${parsed?.confidence ?? result?.confidence ?? 0}% confidence`,
      children: citations.slice(0, 2).map((citation) => ({
        id: `${ticket.id}-${citation.kbSlug}`,
        label: "KB query",
        detail: citation.chunkTitle,
        meta: `${citation.kbTitle} - ${citation.score.toFixed(2)} similarity`
      }))
    },
    {
      id: `${ticket.id}-route`,
      label: routeLabel,
      detail: parsed?.escalation_reason ?? `Assigned to ${specialist}`,
      meta: specialist
    },
    {
      id: `${ticket.id}-response`,
      label: "Work note draft",
      detail: responseText(getSpecialistResponse(result)),
      meta: result?.model_used ?? "gpt-4o-mini"
    }
  ];
}

function buildCloseOut(ticket: DemoTicket, result: RunResult | null) {
  const parsed = result?.parsed;
  const response = getSpecialistResponse(result);
  const lines = [
    `Ticket ${ticket.id}: ${ticket.subject}`,
    `Client: ${parsed?.client_identified ?? "Unknown"}`,
    `Priority: ${parsed?.severity ?? result?.severity ?? "P3"}`,
    `Routing: ${getAssignedSpecialist(result, ticket)}`,
    "",
    responseText(response),
    "",
    `Expected outcome: ${ticket.expectedOutcome}`
  ];
  return lines.join("\n");
}

export const getTicketViews = cache((): TicketView[] => {
  const tickets = getTickets();
  const results = getRunResults();
  const knowledgeBases = getKnowledgeBases();
  return tickets.map((ticket) => {
    const result = results.find((entry) => entry.ticket_id === ticket.id) ?? null;
    const citations = buildCitations(ticket, result, knowledgeBases);
    return {
      ticket,
      result,
      status: getStatus(result),
      requester: getRequester(ticket),
      priority: result?.parsed?.severity ?? result?.severity ?? "P3",
      assignedSpecialist: getAssignedSpecialist(result, ticket),
      client: result?.parsed?.client_identified ?? "Unknown client",
      latencySeconds: result?.elapsed_seconds ?? 18,
      cost: parseCost(result?.cost),
      citations,
      trace: buildTrace(ticket, result, citations),
      closeOutPreview: buildCloseOut(ticket, result)
    };
  });
});

export const getDashboardMetrics = cache((): DashboardMetrics => {
  const views = getTicketViews();
  const totalTickets = views.length;
  const triageCorrect = views.filter((view) => view.result?.triage_correct ?? view.result?.routing_correct).length;
  const resolutionCorrect = views.filter((view) => view.result?.resolution_quality_correct).length;
  const totalCost = views.reduce((sum, view) => sum + view.cost, 0);
  const totalLatency = views.reduce((sum, view) => sum + view.latencySeconds, 0);
  const categoryMap = new Map<string, number>();
  views.forEach((view) => {
    const label = humanize(view.result?.parsed?.classification ?? view.result?.classification ?? view.ticket.type);
    categoryMap.set(label, (categoryMap.get(label) ?? 0) + 1);
  });
  return {
    totalTickets,
    triageCorrectPct: totalTickets ? Math.round((triageCorrect / totalTickets) * 100) : 0,
    resolutionQualityPct: totalTickets ? Math.round((resolutionCorrect / totalTickets) * 100) : 0,
    avgHandleSeconds: totalTickets ? totalLatency / totalTickets : 0,
    totalCost,
    avgCostPerTicket: totalTickets ? totalCost / totalTickets : 0,
    categoryCounts: Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value })),
    costOverTime: views.map((view) => ({ ticket: view.ticket.id, cost: view.cost }))
  };
});

// Re-exported from the client-safe module so existing imports
// (`from "@/lib/demo-data"`) keep working while client components can import the
// formatters directly from "@/lib/format" without pulling in node:fs.
export { formatCurrency, formatSeconds } from "@/lib/format";
