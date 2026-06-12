import { getTicketViews } from "@/lib/demo-data";
import { mergeIntegrationSettings } from "@/lib/integration-settings";
import type { DemoTicket } from "@/types/demo";
import type { IntegrationSettings } from "@/types/integrations";

export const dynamic = "force-dynamic";

type RunRequest = {
  ticket?: DemoTicket;
  settings?: Partial<IntegrationSettings>;
};

async function runBonitoLive(ticket: DemoTicket, settings: IntegrationSettings) {
  const baseUrl = settings.bonito.baseUrl.replace(/\/$/, "");
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: settings.bonito.email, password: settings.bonito.password })
  });

  if (!login.ok) {
    throw new Error(`Bonito login failed (${login.status})`);
  }

  const tokenPayload = await login.json();
  const token = tokenPayload.access_token ?? tokenPayload.token;
  if (!token) {
    throw new Error("Bonito login did not return a token");
  }

  const execute = await fetch(`${baseUrl}/api/agents/${settings.bonito.triageAgentId}/execute`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: `${ticket.subject}\n\n${ticket.body}` })
  });

  if (!execute.ok) {
    throw new Error(`Bonito execute failed (${execute.status})`);
  }

  return execute.json();
}

export async function POST(request: Request) {
  const body = (await request.json()) as RunRequest;
  const settings = mergeIntegrationSettings(body.settings);
  const ticket = body.ticket;

  if (!ticket) {
    return Response.json({ error: "ticket is required" }, { status: 400 });
  }

  const localView = getTicketViews().find((entry) => entry.ticket.id === ticket.id);

  if (
    settings.bonito.mode === "live" &&
    settings.bonito.baseUrl &&
    settings.bonito.email &&
    settings.bonito.password &&
    settings.bonito.triageAgentId
  ) {
    try {
      const response = await runBonitoLive(ticket, settings);
      return Response.json({
        mode: "live",
        ticketId: ticket.id,
        response,
        warning: null
      });
    } catch (error) {
      return Response.json({
        mode: "mock",
        ticketId: ticket.id,
        warning: error instanceof Error ? error.message : "Live Bonito run failed",
        response: localView?.result ?? null
      });
    }
  }

  return Response.json({
    mode: "mock",
    ticketId: ticket.id,
    warning: "Bonito is in mock mode or credentials are incomplete.",
    response: localView?.result ?? null
  });
}
