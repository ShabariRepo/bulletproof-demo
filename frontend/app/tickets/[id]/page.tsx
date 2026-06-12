import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, ClipboardCheck, UserRound } from "lucide-react";
import { CitationPanel } from "@/components/tickets/citation-panel";
import { LiveRunPanel } from "@/components/tickets/live-run-panel";
import { StatusBadge } from "@/components/tickets/status-badge";
import { TraceTimeline } from "@/components/tickets/trace-timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatSeconds, getTicketViews } from "@/lib/demo-data";

export function generateStaticParams() {
  return getTicketViews().map((view) => ({ id: view.ticket.id }));
}

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const view = getTicketViews().find((entry) => entry.ticket.id === params.id);
  if (!view) notFound();

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-100">
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <section className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{view.ticket.id}</Badge>
                    <StatusBadge status={view.status} />
                    <Badge variant="outline">{view.priority}</Badge>
                  </div>
                  <CardTitle className="mt-4 text-2xl">{view.ticket.subject}</CardTitle>
                </div>
                <div className="text-right text-sm text-zinc-500">
                  <div>{formatSeconds(view.latencySeconds)}</div>
                  <div>{formatCurrency(view.cost)}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-md border border-border bg-zinc-950 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                    <UserRound className="h-4 w-4" />
                    Requester
                  </div>
                  <div className="mt-2 text-sm text-zinc-200">{view.requester}</div>
                </div>
                <div className="rounded-md border border-border bg-zinc-950 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                    <Bot className="h-4 w-4" />
                    Specialist
                  </div>
                  <div className="mt-2 text-sm text-zinc-200">{view.assignedSpecialist}</div>
                </div>
                <div className="rounded-md border border-border bg-zinc-950 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                    <ClipboardCheck className="h-4 w-4" />
                    Client
                  </div>
                  <div className="mt-2 text-sm text-zinc-200">{view.client}</div>
                </div>
              </div>
              <Separator className="my-6" />
              <div>
                <div className="text-sm font-medium text-zinc-100">Original ticket</div>
                <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-zinc-950 p-4 text-sm leading-6 text-zinc-400">
                  {view.ticket.body}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agent Trace</CardTitle>
            </CardHeader>
            <CardContent>
              <TraceTimeline steps={view.trace} />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5">
          <LiveRunPanel ticket={view.ticket} closeOutPreview={view.closeOutPreview} />
          <Card>
            <CardHeader>
              <CardTitle>KB Citations</CardTitle>
            </CardHeader>
            <CardContent>
              <CitationPanel citations={view.citations} />
            </CardContent>
          </Card>
        </aside>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Halo Close-out Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-lg border border-border bg-zinc-950 p-5 text-sm leading-6 text-zinc-300">
            {view.closeOutPreview}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
