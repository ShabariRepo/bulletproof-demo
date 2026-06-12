"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Play, SendHorizonal } from "lucide-react";
import { defaultIntegrationSettings, integrationStorageKey, mergeIntegrationSettings } from "@/lib/integration-settings";
import type { DemoTicket } from "@/types/demo";
import type { IntegrationSettings, LiveRunEvent } from "@/types/integrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function loadSettings(): IntegrationSettings {
  if (typeof window === "undefined") return defaultIntegrationSettings;
  const stored = window.localStorage.getItem(integrationStorageKey);
  if (!stored) return defaultIntegrationSettings;
  try {
    return mergeIntegrationSettings(JSON.parse(stored));
  } catch {
    return defaultIntegrationSettings;
  }
}

export function LiveRunPanel({ ticket, closeOutPreview }: { ticket: DemoTicket; closeOutPreview: string }) {
  const [events, setEvents] = useState<LiveRunEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState("");
  const [haloMessage, setHaloMessage] = useState("");

  async function executeRun() {
    setRunning(true);
    setRunMessage("");
    setEvents([]);

    await new Promise<void>((resolve) => {
      const source = new EventSource(`/api/bonito/events?ticketId=${encodeURIComponent(ticket.id)}`);
      source.onmessage = (message) => {
        const payload = JSON.parse(message.data) as LiveRunEvent | { done: true };
        if ("done" in payload) {
          source.close();
          resolve();
          return;
        }
        setEvents((current) => [...current, payload]);
      };
      source.onerror = () => {
        source.close();
        resolve();
      };
    });

    const response = await fetch("/api/bonito/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket, settings: loadSettings() })
    });
    const payload = await response.json();
    setRunMessage(payload.warning ? `${payload.mode.toUpperCase()}: ${payload.warning}` : `${payload.mode.toUpperCase()}: run complete`);
    setRunning(false);
  }

  async function writeHalo() {
    setHaloMessage("");
    const response = await fetch("/api/halo/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: ticket.id,
        note: closeOutPreview,
        outcome: "resolved",
        settings: loadSettings()
      })
    });
    const payload = await response.json();
    setHaloMessage(payload.warning ? `Mock write-back: ${payload.warning}` : `${payload.mode.toUpperCase()} write-back complete: ${payload.actionId ?? ticket.id}`);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Live Run</CardTitle>
        <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
          Phase 1-2
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-3">
          <Button onClick={executeRun} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run ticket
          </Button>
          <Button variant="outline" onClick={writeHalo}>
            <SendHorizonal className="h-4 w-4" />
            Write to Halo
          </Button>
        </div>

        {runMessage ? <div className="rounded-md border border-border bg-zinc-950 p-3 text-sm text-zinc-300">{runMessage}</div> : null}
        {haloMessage ? <div className="rounded-md border border-border bg-zinc-950 p-3 text-sm text-zinc-300">{haloMessage}</div> : null}

        <div className="space-y-3">
          {events.length ? (
            events.map((event) => (
              <div key={event.id} className="rounded-md border border-border bg-zinc-950 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    {event.label}
                  </div>
                  <span className="text-xs text-zinc-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{event.detail}</p>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-zinc-500">
              Run a ticket to stream router, KB, specialist, and close-out events.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
