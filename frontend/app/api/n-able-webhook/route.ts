import { normalizeNableAlert } from "@/lib/ticket-normalizers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const ticket = normalizeNableAlert(payload);

  return Response.json({
    source: "n-able",
    ticket,
    next: {
      runEndpoint: "/api/bonito/run",
      haloEndpoint: "/api/halo/tickets"
    },
    receivedAt: new Date().toISOString()
  });
}
