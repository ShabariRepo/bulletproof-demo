import { normalizeSentinelAlert } from "@/lib/ticket-normalizers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const ticket = normalizeSentinelAlert(payload);

  return Response.json({
    source: "sentinel",
    ticket,
    next: {
      runEndpoint: "/api/bonito/run",
      haloEndpoint: "/api/halo/tickets"
    },
    receivedAt: new Date().toISOString()
  });
}
