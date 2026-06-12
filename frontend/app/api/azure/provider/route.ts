import { azureProviderSnippet, mergeIntegrationSettings } from "@/lib/integration-settings";
import type { IntegrationSettings } from "@/types/integrations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { settings?: Partial<IntegrationSettings> };
  const settings = mergeIntegrationSettings(body.settings);
  const missing = [
    ["tenantId", settings.azure.tenantId],
    ["subscriptionId", settings.azure.subscriptionId],
    ["openAiEndpoint", settings.azure.openAiEndpoint],
    ["deploymentName", settings.azure.deploymentName]
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return Response.json({
    ready: missing.length === 0,
    missing,
    provider: "azure",
    snippet: azureProviderSnippet(settings)
  });
}
