"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { TraceStep } from "@/types/demo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function TraceNode({ step, depth = 0 }: { step: TraceStep; depth?: number }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = Boolean(step.children?.length);

  return (
    <div className={cn(depth > 0 && "ml-7 border-l border-border pl-5")}>
      <div className="flex gap-3 py-3">
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-zinc-950 text-xs text-zinc-500">
          {hasChildren ? (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen((value) => !value)}>
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              <span className="sr-only">Toggle trace step</span>
            </Button>
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-zinc-100">{step.label}</div>
            <div className="text-xs text-zinc-500">{step.meta}</div>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{step.detail}</p>
        </div>
      </div>
      {hasChildren && open ? (
        <div className="pb-2">
          {step.children?.map((child) => (
            <TraceNode key={child.id} step={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TraceTimeline({ steps }: { steps: TraceStep[] }) {
  return (
    <div>
      {steps.map((step) => (
        <TraceNode key={step.id} step={step} />
      ))}
    </div>
  );
}
