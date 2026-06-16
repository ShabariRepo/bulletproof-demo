import { SimulateWorkbench } from "@/components/simulate/simulate-workbench";
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
            Single mode mints one Tier-1 ticket and watches it flow through the real Bonito Triage Router. Burst mode
            fires a dozen tickets at once to show the Agent HPA autoscaler doubling capacity and the overflow queue
            catching the excess — every number is live from the agent.
          </p>
        </div>
      </section>

      <SimulateWorkbench recentCount={history.length} />
    </div>
  );
}
