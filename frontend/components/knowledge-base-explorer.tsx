"use client";

import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import type { KnowledgeBase } from "@/types/demo";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function KnowledgeBaseExplorer({ knowledgeBases }: { knowledgeBases: KnowledgeBase[] }) {
  const [selected, setSelected] = useState(knowledgeBases[0]?.slug ?? "");
  const active = knowledgeBases.find((kb) => kb.slug === selected) ?? knowledgeBases[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
      <div className="space-y-3">
        {knowledgeBases.map((kb) => (
          <button
            key={kb.slug}
            type="button"
            onClick={() => setSelected(kb.slug)}
            className={cn(
              "w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50",
              selected === kb.slug && "border-primary/60 bg-zinc-900"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                  <BookOpen className="h-4 w-4 text-primary" />
                  {kb.title}
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-500">{kb.excerpt}</p>
              </div>
              <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-zinc-500 transition-transform", selected === kb.slug && "rotate-180")} />
            </div>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border px-6 py-5">
            <div className="text-sm text-zinc-500">{active.filename}</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-50">{active.title}</h2>
          </div>
          <ScrollArea className="h-[42rem]">
            <div className="markdown p-4 sm:p-6">
              <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{active.markdown}</pre>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
