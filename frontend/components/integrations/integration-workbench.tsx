"use client";

import { useState } from "react";
import { Cloud, Download, RadioTower, ServerCog } from "lucide-react";
import { defaultIntegrationSettings, integrationStorageKey, mergeIntegrationSettings } from "@/lib/integration-settings";
import type { IntegrationSettings } from "@/types/integrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function loadSettings(): IntegrationSettings {
  const stored = window.localStorage.getItem(integrationStorageKey);
  if (!stored) return defaultIntegrationSettings;
  try {
    return mergeIntegrationSettings(JSON.parse(stored));
  } catch {
    return defaultIntegrationSettings;
  }
}

const samples = {
  nable: {
    alertId: "NABLE-CPU-4421",
    alertName: "Endpoint CPU sustained above 95%",
    severity: "warning",
    customerName: "Pinnacle Properties",
    deviceName: "PP-LT-089",
    policyName: "Critical workstation health",
    description: "Device has exceeded CPU threshold for 20 minutes."
  },
  sentinel: {
    incidentId: "INC-2026-0542",
    title: "Multiple failed login attempts followed by unusual successful login",
    severity: "High",
    client: "Maple Ridge Municipality",
    incidentUrl: "https://portal.azure.com/incidents/INC-2026-0542",
    description: "Successful login from unusual location after repeated failed attempts."
  }
};

export function IntegrationWorkbench() {
  const [output, setOutput] = useState("Run an integration test to see the normalized payload.");

  async function postJson(url: string, body: unknown) {
    setOutput("Running...");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setOutput(JSON.stringify(await response.json(), null, 2));
  }

  async function importHalo() {
    setOutput("Importing...");
    const response = await fetch("/api/halo/tickets");
    setOutput(JSON.stringify(await response.json(), null, 2));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[24rem_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>N-able</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => postJson("/api/n-able-webhook", samples.nable)}>
              <ServerCog className="h-4 w-4" />
              Send sample alert
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sentinel</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => postJson("/api/sentinel-webhook", samples.sentinel)}>
              <RadioTower className="h-4 w-4" />
              Send sample incident
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Halo</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={importHalo}>
              <Download className="h-4 w-4" />
              Import open tickets
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Azure</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => postJson("/api/azure/provider", { settings: loadSettings() })}>
              <Cloud className="h-4 w-4" />
              Validate provider config
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integration Output</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="min-h-[34rem] whitespace-pre-wrap rounded-md border border-border bg-zinc-950 p-4 text-xs leading-5 text-zinc-300">
            {output}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
