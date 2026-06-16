import { IntegrationWorkbench } from "@/components/integrations/integration-workbench";

export default function IntegrationsPage() {
  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Live integration paths</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-semibold tracking-normal text-zinc-50">Integration Workbench</h2>
          <span className="inline-flex items-center rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-400">
            Demo
          </span>
        </div>
        <p className="mt-3 text-base leading-7 text-zinc-500">
          Exercise the Halo import, N-able alert ingest, Sentinel incident ingest, and Azure provider validation paths from the local UI.
        </p>
      </section>
      <IntegrationWorkbench />
    </div>
  );
}
