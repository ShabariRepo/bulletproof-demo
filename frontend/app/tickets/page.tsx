import { TicketsBrowser } from "@/components/tickets/tickets-browser";
import { getTicketViews } from "@/lib/demo-data";
import { readLiveRuns } from "@/lib/live-runs";
import { liveRunToRow, ticketViewToRow, type TicketRow } from "@/lib/run-rows";

export const dynamic = "force-dynamic";

export default function TicketsIndexPage() {
  // Merge both sources into one unified, normalized row set:
  //  - 10 canonical demo tickets (have a real /tickets/[id] detail page, no date)
  //  - all stored runs (seed/live/burst — no detail page, open a modal)
  const canonical = getTicketViews().map(ticketViewToRow);
  const stored = readLiveRuns().map(liveRunToRow);
  const rows: TicketRow[] = [...canonical, ...stored];

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Ticket history</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-50">Ticket browser</h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-500">
          Every handled ticket in one place — the {canonical.length} canonical demo cases plus{" "}
          {stored.length.toLocaleString()} stored runs (live, burst, and seeded sample history). Filter, search, and
          page through {rows.length.toLocaleString()} total. Demo tickets open their full trace; stored runs open a
          quick detail card.
        </p>
      </section>

      <TicketsBrowser rows={rows} />
    </div>
  );
}
