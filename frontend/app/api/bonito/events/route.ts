import { getTicketViews } from "@/lib/demo-data";
import type { LiveRunEvent } from "@/types/integrations";

export const dynamic = "force-dynamic";

function eventLine(event: LiveRunEvent | { done: true }) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get("ticketId");
  const view = getTicketViews().find((entry) => entry.ticket.id === ticketId) ?? getTicketViews()[0];
  const now = new Date();
  const events: LiveRunEvent[] = [
    {
      id: "intake",
      label: "Ticket received",
      detail: `${view.ticket.id} queued for triage`,
      timestamp: now.toISOString(),
      status: "complete"
    },
    {
      id: "router",
      label: "Triage router",
      detail: `Classified as ${view.result?.parsed?.classification ?? view.ticket.type}`,
      timestamp: new Date(now.getTime() + 600).toISOString(),
      status: "complete"
    },
    {
      id: "kb",
      label: "Knowledge search",
      detail: view.citations.map((citation) => citation.kbTitle).join(", "),
      timestamp: new Date(now.getTime() + 1200).toISOString(),
      status: "complete"
    },
    {
      id: "specialist",
      label: "Specialist handoff",
      detail: view.assignedSpecialist,
      timestamp: new Date(now.getTime() + 1800).toISOString(),
      status: view.status === "escalated" ? "running" : "complete"
    },
    {
      id: "closeout",
      label: "Halo work-note draft",
      detail: view.status === "escalated" ? "Prepared escalation note" : "Prepared resolution note",
      timestamp: new Date(now.getTime() + 2400).toISOString(),
      status: "complete"
    }
  ];

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      events.forEach((event, index) => {
        setTimeout(() => {
          controller.enqueue(encoder.encode(eventLine(event)));
          if (index === events.length - 1) {
            controller.enqueue(encoder.encode(eventLine({ done: true })));
            controller.close();
          }
        }, index * 250);
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
