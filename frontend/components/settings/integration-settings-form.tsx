"use client";

import { useEffect, useMemo, useState } from "react";
import { Cloud, Plug, RadioTower, Save, ServerCog, Sparkles } from "lucide-react";
import { azureProviderSnippet, defaultIntegrationSettings, integrationStorageKey, mergeIntegrationSettings } from "@/lib/integration-settings";
import type { IntegrationSettings } from "@/types/integrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Section = keyof IntegrationSettings;

const sections: Array<{ id: Section; label: string; title: string; icon: typeof Cloud }> = [
  { id: "bonito", label: "Bonito", title: "Bonito agent runtime", icon: Sparkles },
  { id: "halo", label: "Halo", title: "Halo ITSM connection", icon: Plug },
  { id: "nable", label: "N-able", title: "N-able alert ingest", icon: ServerCog },
  { id: "sentinel", label: "Sentinel", title: "Microsoft Sentinel ingest", icon: RadioTower },
  { id: "azure", label: "Azure", title: "Azure OpenAI provider", icon: Cloud }
];

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder ?? "Not configured"}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-border bg-zinc-950 px-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-primary/70"
      />
    </label>
  );
}

export function IntegrationSettingsForm() {
  const [settings, setSettings] = useState<IntegrationSettings>(defaultIntegrationSettings);
  const [savedAt, setSavedAt] = useState("");
  const snippet = useMemo(() => azureProviderSnippet(settings), [settings]);

  useEffect(() => {
    const stored = window.localStorage.getItem(integrationStorageKey);
    if (stored) {
      setSettings(mergeIntegrationSettings(JSON.parse(stored)));
    }
  }, []);

  function update<SectionKey extends Section, FieldKey extends keyof IntegrationSettings[SectionKey]>(
    section: SectionKey,
    field: FieldKey,
    value: IntegrationSettings[SectionKey][FieldKey]
  ) {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value
      }
    }));
  }

  function save() {
    window.localStorage.setItem(integrationStorageKey, JSON.stringify(settings));
    setSavedAt(new Date().toLocaleTimeString());
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-500">Saved settings stay in this browser and are sent only when you run a ticket or test an integration.</div>
        <Button onClick={save}>
          <Save className="h-4 w-4" />
          Save settings
        </Button>
      </div>
      {savedAt ? <div className="text-sm text-emerald-300">Saved at {savedAt}</div> : null}

      <Tabs defaultValue="bonito" className="space-y-5">
        <TabsList>
          {sections.map((section) => (
            <TabsTrigger key={section.id} value={section.id}>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {sections.map((section) => (
          <TabsContent key={section.id} value={section.id}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-zinc-950">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>{section.title}</CardTitle>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
                  Configurable
                </Badge>
              </CardHeader>
              <CardContent>
                <Separator className="mb-6" />

                {section.id === "bonito" ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-zinc-300">Run mode</span>
                      <select
                        value={settings.bonito.mode}
                        onChange={(event) => update("bonito", "mode", event.target.value as "mock" | "live")}
                        className="h-11 w-full rounded-md border border-border bg-zinc-950 px-3 text-sm text-zinc-200 outline-none focus:border-primary/70"
                      >
                        <option value="mock">Mock local run</option>
                        <option value="live">Live Bonito API</option>
                      </select>
                    </label>
                    <Field label="Base URL" value={settings.bonito.baseUrl} onChange={(value) => update("bonito", "baseUrl", value)} />
                    <Field label="Email" value={settings.bonito.email} onChange={(value) => update("bonito", "email", value)} />
                    <Field label="Password" type="password" value={settings.bonito.password} onChange={(value) => update("bonito", "password", value)} />
                    <Field label="Triage router agent ID" value={settings.bonito.triageAgentId} onChange={(value) => update("bonito", "triageAgentId", value)} />
                  </div>
                ) : null}

                {section.id === "halo" ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-zinc-300">Run mode</span>
                      <select
                        value={settings.halo.mode}
                        onChange={(event) => update("halo", "mode", event.target.value as "mock" | "live")}
                        className="h-11 w-full rounded-md border border-border bg-zinc-950 px-3 text-sm text-zinc-200 outline-none focus:border-primary/70"
                      >
                        <option value="mock">Mock Halo</option>
                        <option value="live">Live Halo/mock server</option>
                      </select>
                    </label>
                    <Field label="Tenant URL" value={settings.halo.tenantUrl} onChange={(value) => update("halo", "tenantUrl", value)} />
                    <Field label="Client ID" value={settings.halo.clientId} onChange={(value) => update("halo", "clientId", value)} />
                    <Field label="Client secret" type="password" value={settings.halo.clientSecret} onChange={(value) => update("halo", "clientSecret", value)} />
                  </div>
                ) : null}

                {section.id === "nable" ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Webhook secret" type="password" value={settings.nable.webhookSecret} onChange={(value) => update("nable", "webhookSecret", value)} />
                    <Field label="API token" type="password" value={settings.nable.apiToken} onChange={(value) => update("nable", "apiToken", value)} />
                    <Field label="Device group" value={settings.nable.deviceGroup} onChange={(value) => update("nable", "deviceGroup", value)} />
                    <Field label="Alert policy" value={settings.nable.alertPolicy} onChange={(value) => update("nable", "alertPolicy", value)} />
                    <div className="md:col-span-2 rounded-md border border-border bg-zinc-950 p-4 text-sm text-zinc-400">
                      Webhook endpoint: <span className="text-zinc-100">/api/n-able-webhook</span>
                    </div>
                  </div>
                ) : null}

                {section.id === "sentinel" ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Webhook secret" type="password" value={settings.sentinel.webhookSecret} onChange={(value) => update("sentinel", "webhookSecret", value)} />
                    <Field label="Workspace ID" value={settings.sentinel.workspaceId} onChange={(value) => update("sentinel", "workspaceId", value)} />
                    <Field label="Subscription ID" value={settings.sentinel.subscriptionId} onChange={(value) => update("sentinel", "subscriptionId", value)} />
                    <Field label="Resource group" value={settings.sentinel.resourceGroup} onChange={(value) => update("sentinel", "resourceGroup", value)} />
                    <div className="md:col-span-2 rounded-md border border-border bg-zinc-950 p-4 text-sm text-zinc-400">
                      Webhook endpoint: <span className="text-zinc-100">/api/sentinel-webhook</span>
                    </div>
                  </div>
                ) : null}

                {section.id === "azure" ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Tenant ID" value={settings.azure.tenantId} onChange={(value) => update("azure", "tenantId", value)} />
                    <Field label="Subscription ID" value={settings.azure.subscriptionId} onChange={(value) => update("azure", "subscriptionId", value)} />
                    <Field label="Resource group" value={settings.azure.resourceGroup} onChange={(value) => update("azure", "resourceGroup", value)} />
                    <Field label="Azure OpenAI endpoint" value={settings.azure.openAiEndpoint} onChange={(value) => update("azure", "openAiEndpoint", value)} />
                    <Field label="Deployment name" value={settings.azure.deploymentName} onChange={(value) => update("azure", "deploymentName", value)} />
                    <Field label="Log Analytics workspace" value={settings.azure.logAnalyticsWorkspace} onChange={(value) => update("azure", "logAnalyticsWorkspace", value)} />
                    <pre className="md:col-span-2 whitespace-pre-wrap rounded-md border border-border bg-zinc-950 p-4 text-xs leading-5 text-zinc-400">
                      {snippet}
                    </pre>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
