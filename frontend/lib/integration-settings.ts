import type { IntegrationSettings } from "@/types/integrations";

export const integrationStorageKey = "silver-bullet.integration-settings.v1";

export const defaultIntegrationSettings: IntegrationSettings = {
  bonito: {
    mode: "mock",
    baseUrl: "https://api.getbonito.com",
    apiToken: "",
    triageAgentId: "98c6d000"
  },
  halo: {
    mode: "mock",
    tenantUrl: "http://localhost:8090",
    clientId: "",
    clientSecret: ""
  },
  nable: {
    webhookSecret: "",
    apiToken: "",
    deviceGroup: "Tier 1 monitored endpoints",
    alertPolicy: "Critical endpoint alerts"
  },
  sentinel: {
    webhookSecret: "",
    workspaceId: "",
    subscriptionId: "",
    resourceGroup: ""
  },
  azure: {
    tenantId: "",
    subscriptionId: "",
    resourceGroup: "",
    openAiEndpoint: "",
    deploymentName: "gpt-4o-mini",
    logAnalyticsWorkspace: ""
  }
};

export function mergeIntegrationSettings(value: unknown): IntegrationSettings {
  const partial = (value && typeof value === "object" ? value : {}) as Partial<IntegrationSettings>;
  return {
    bonito: { ...defaultIntegrationSettings.bonito, ...partial.bonito },
    halo: { ...defaultIntegrationSettings.halo, ...partial.halo },
    nable: { ...defaultIntegrationSettings.nable, ...partial.nable },
    sentinel: { ...defaultIntegrationSettings.sentinel, ...partial.sentinel },
    azure: { ...defaultIntegrationSettings.azure, ...partial.azure }
  };
}

export function azureProviderSnippet(settings: IntegrationSettings) {
  return [
    "provider: azure",
    "model: gpt-4o-mini",
    "azure:",
    `  tenant_id: ${settings.azure.tenantId || "<tenant-id>"}`,
    `  subscription_id: ${settings.azure.subscriptionId || "<subscription-id>"}`,
    `  resource_group: ${settings.azure.resourceGroup || "<resource-group>"}`,
    `  endpoint: ${settings.azure.openAiEndpoint || "https://<resource>.openai.azure.com"}`,
    `  deployment: ${settings.azure.deploymentName || "gpt-4o-mini"}`,
    `  log_analytics_workspace: ${settings.azure.logAnalyticsWorkspace || "<workspace-id>"}`
  ].join("\n");
}
