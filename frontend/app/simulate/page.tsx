import { SimulateWorkbench } from "@/components/simulate/simulate-workbench";
import { readLiveRuns } from "@/lib/live-runs";

export const dynamic = "force-dynamic";

export default function SimulatePage() {
  const history = readLiveRuns().slice(-8).reverse();
  const burstEnabled = process.env.NEXT_PUBLIC_ENABLE_BURST === "1";

  return (
    <div className="space-y-8">
      <section>
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Live Simulation</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-50">Run a real Tier-1 ticket</h2>
          <p className="mt-3 text-base leading-7 text-zinc-500">
            Mints a real Tier-1 ticket and watches it flow through the live Bonito Triage Router — classification,
            KB-grounded resolution, and routing to the right specialist (or escalation). Every number is live from
            the agent.{burstEnabled ? " Switch to Burst mode to fire a dozen tickets at once and watch the Agent HPA autoscaler absorb the spike." : ""}
          </p>
        </div>
      </section>

      <SimulateWorkbench recentCount={history.length} />
    </div>
  );
}
