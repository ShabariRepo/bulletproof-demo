import { IntegrationWorkbench } from "@/components/integrations/integration-workbench";

export default function IntegrationsPage() {
  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Live integration paths</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-50">Integration Workbench</h2>
        <p className="mt-3 text-base leading-7 text-zinc-500">
          Exercise the Halo import, N-able alert ingest, Sentinel incident ingest, and Azure provider validation paths from the local UI.
        </p>
      </section>
      <IntegrationWorkbench />
    </div>
  );
}
