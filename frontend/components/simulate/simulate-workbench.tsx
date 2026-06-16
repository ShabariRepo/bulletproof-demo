"use client";

import { useState } from "react";
import { Play, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveSimulation } from "@/components/simulate/live-simulation";
import { BurstSimulation } from "@/components/simulate/burst-simulation";

type Mode = "single" | "burst";

// Burst fires real concurrent prod LLM calls (cost + warm-state scaling nuance),
// so it's hidden for unsupervised viewing (e.g. a shared tunnel). Set
// NEXT_PUBLIC_ENABLE_BURST=1 to surface it for a live, driven demo.
const BURST_ENABLED = process.env.NEXT_PUBLIC_ENABLE_BURST === "1";

export function SimulateWorkbench({ recentCount }: { recentCount: number }) {
  const [mode, setMode] = useState<Mode>("single");

  if (!BURST_ENABLED) {
    return (
      <div className="space-y-6">
        <LiveSimulation recentCount={recentCount} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="inline-flex rounded-lg border border-border bg-zinc-950 p-1">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            mode === "single" ? "bg-primary text-primary-foreground" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Play className="h-4 w-4" />
          Single ticket
        </button>
        <button
          type="button"
          onClick={() => setMode("burst")}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            mode === "burst" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Zap className="h-4 w-4" />
          Burst mode
        </button>
      </div>

      {mode === "single" ? <LiveSimulation recentCount={recentCount} /> : <BurstSimulation />}
    </div>
  );
}
