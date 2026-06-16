export type TicketStatus = "resolved" | "in-progress" | "escalated" | "queued";

export type DemoTicket = {
  id: string;
  type: string;
  subject: string;
  body: string;
  expectedRouting: string;
  expectedOutcome: string;
};

export type RunResult = {
  ticket_id: string;
  ticket_type: string;
  subject: string;
  expected_routing: string;
  actual_routing: string;
  routing_correct: boolean;
  triage_correct?: boolean;
  resolution_quality_correct?: boolean;
  resolution_failures?: string[];
  severity?: string;
  confidence?: number;
  classification?: string;
  response?: string;
  parsed?: {
    classification?: string;
    severity?: string;
    confidence?: number;
    client_identified?: string;
    action?: string;
    specialist?: string;
    reasoning?: string;
    escalation_reason?: string | null;
    specialist_response?: SpecialistResponse | string | null;
  };
  model_used?: string;
  tokens?: number;
  cost?: string | number;
  session_id?: string;
  elapsed_seconds?: number;
};

export type SpecialistResponse = {
  resolution?: string;
  steps_taken?: string[];
  client?: string;
  identity_provider?: string;
  procedure_used?: string;
  halo_ticket_id?: string;
  follow_up_needed?: string | null;
  escalation_reason?: string | null;
  vpn_type?: string;
  error_identified?: string;
};

export type KnowledgeBase = {
  slug: string;
  title: string;
  filename: string;
  markdown: string;
  excerpt: string;
};

export type AgentProfile = {
  slug: string;
  name: string;
  model: string;
  prompt: string;
  attachments: string[];
};

export type Citation = {
  kbSlug: string;
  kbTitle: string;
  chunkTitle: string;
  excerpt: string;
  score: number;
};

export type TraceStep = {
  id: string;
  label: string;
  detail: string;
  meta: string;
  children?: TraceStep[];
};

export type TicketView = {
  ticket: DemoTicket;
  result: RunResult | null;
  status: TicketStatus;
  requester: string;
  priority: string;
  assignedSpecialist: string;
  client: string;
  latencySeconds: number;
  cost: number;
  citations: Citation[];
  trace: TraceStep[];
  closeOutPreview: string;
};

export type DashboardMetrics = {
  totalTickets: number;
  triageCorrectPct: number;
  resolutionQualityPct: number;
  avgHandleSeconds: number;
  totalCost: number;
  avgCostPerTicket: number;
  categoryCounts: Array<{ name: string; value: number }>;
  costOverTime: Array<{ ticket: string; cost: number }>;
};
