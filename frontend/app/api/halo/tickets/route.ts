import { getTicketViews } from "@/lib/demo-data";
import { normalizeHaloTicket } from "@/lib/ticket-normalizers";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    mode: "mock",
    tickets: getTicketViews().map((view) => ({
      id: view.ticket.id,
      summary: view.ticket.subject,
      details: view.ticket.body,
      client_name: view.client,
      priority: view.priority,
      status: view.status
    }))
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  return Response.json({
    mode: "mock",
    ticket: normalizeHaloTicket(payload),
    receivedAt: new Date().toISOString()
  });
}
