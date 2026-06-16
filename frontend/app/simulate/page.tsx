import { LiveSimulation } from "@/components/simulate/live-simulation";
import { readLiveRuns } from "@/lib/live-runs";

export const dynamic = "force-dynamic";

export default function SimulatePage() {
  const history = readLiveRuns().slice(-8).reverse();

  return (
    <div className="space-y-8">
      <section>
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Live Simulation</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-50">Run a real Tier-1 ticket</h2>
          <p className="mt-3 text-base leading-7 text-zinc-500">
            Press the button to mint a random Tier-1 ticket and watch it flow through the real Bonito Triage Router —
            classified, routed to a specialist (or escalated), grounded in the right knowledge base, and resolved. Every
            number shown comes straight from the live agent response.
          </p>
        </div>
      </section>

      <LiveSimulation recentCount={history.length} />
    </div>
  );
}
