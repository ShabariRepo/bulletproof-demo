"use client";

import { useState } from "react";
import { Play, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveSimulation } from "@/components/simulate/live-simulation";
import { BurstSimulation } from "@/components/simulate/burst-simulation";

type Mode = "single" | "burst";

export function SimulateWorkbench({ recentCount }: { recentCount: number }) {
  const [mode, setMode] = useState<Mode>("single");

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
