import { NodeCalendar } from "@/components/calendar/node-calendar";
import { readRunsByDay } from "@/lib/live-runs";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  const buckets = readRunsByDay();

  return (
    <div className="space-y-8">
      <section>
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Activity Calendar</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-50">Busy vs quiet days</h2>
          <p className="mt-3 text-base leading-7 text-zinc-500">
            A node-style heatmap of ticket volume across the month. Each day glows brighter and larger the busier it
            gets — quiet weekends stay dim, spike days burn hot. Click any node for that day&apos;s breakdown:
            escalations, misroutes, cost, and the category split.
          </p>
        </div>
      </section>

      <NodeCalendar buckets={buckets} />
    </div>
  );
}
