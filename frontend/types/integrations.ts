export type BonitoSettings = {
  mode: "mock" | "live";
  baseUrl: string;
  email: string;
  password: string;
  triageAgentId: string;
};

export type HaloSettings = {
  mode: "mock" | "live";
  tenantUrl: string;
  clientId: string;
  clientSecret: string;
};

export type NableSettings = {
  webhookSecret: string;
  apiToken: string;
  deviceGroup: string;
  alertPolicy: string;
};

export type SentinelSettings = {
  webhookSecret: string;
  workspaceId: string;
  subscriptionId: string;
  resourceGroup: string;
};

export type AzureSettings = {
  tenantId: string;
  subscriptionId: string;
  resourceGroup: string;
  openAiEndpoint: string;
  deploymentName: string;
  logAnalyticsWorkspace: string;
};

export type IntegrationSettings = {
  bonito: BonitoSettings;
  halo: HaloSettings;
  nable: NableSettings;
  sentinel: SentinelSettings;
  azure: AzureSettings;
};

export type LiveRunEvent = {
  id: string;
  label: string;
  detail: string;
  timestamp: string;
  status: "queued" | "running" | "complete" | "error";
};
