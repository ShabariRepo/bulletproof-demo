import { IntegrationSettingsForm } from "@/components/settings/integration-settings-form";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Tenant connections</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-50">Settings</h2>
        <p className="mt-3 text-base leading-7 text-zinc-500">
          Configure Bonito, Halo, N-able, Sentinel, and Azure provider details for local demo runs or real tenant testing.
        </p>
      </section>

      <IntegrationSettingsForm />
    </div>
  );
}
