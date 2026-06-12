import { mergeIntegrationSettings } from "@/lib/integration-settings";
import type { IntegrationSettings } from "@/types/integrations";

export const dynamic = "force-dynamic";

type HaloActionRequest = {
  ticketId?: string;
  note?: string;
  outcome?: "resolved" | "escalated" | "pending";
  settings?: Partial<IntegrationSettings>;
};

async function writeHaloLive(body: HaloActionRequest, settings: IntegrationSettings) {
  const baseUrl = settings.halo.tenantUrl.replace(/\/$/, "");
  const token = Buffer.from(`${settings.halo.clientId}:${settings.halo.clientSecret}`).toString("base64");
  const response = await fetch(`${baseUrl}/api/Tickets/${body.ticketId}/Notes`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ note: body.note, is_internal: false })
  });

  if (!response.ok) {
    throw new Error(`Halo write-back failed (${response.status})`);
  }

  return response.json();
}

export async function POST(request: Request) {
  const body = (await request.json()) as HaloActionRequest;
  const settings = mergeIntegrationSettings(body.settings);

  if (!body.ticketId || !body.note) {
    return Response.json({ error: "ticketId and note are required" }, { status: 400 });
  }

  if (settings.halo.mode === "live" && settings.halo.tenantUrl && settings.halo.clientId && settings.halo.clientSecret) {
    try {
      const response = await writeHaloLive(body, settings);
      return Response.json({ mode: "live", ticketId: body.ticketId, response });
    } catch (error) {
      return Response.json({
        mode: "mock",
        ticketId: body.ticketId,
        warning: error instanceof Error ? error.message : "Halo write-back failed",
        actionId: `MOCK-ACTION-${Date.now()}`
      });
    }
  }

  return Response.json({
    mode: "mock",
    ticketId: body.ticketId,
    outcome: body.outcome ?? "resolved",
    actionId: `MOCK-ACTION-${Date.now()}`,
    writtenAt: new Date().toISOString()
  });
}
