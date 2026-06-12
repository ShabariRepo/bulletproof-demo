import { BookOpenCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Citation } from "@/types/demo";

export function CitationPanel({ citations }: { citations: Citation[] }) {
  return (
    <ScrollArea className="h-[34rem] pr-3">
      <div className="space-y-4">
        {citations.map((citation) => (
          <div key={`${citation.kbSlug}-${citation.chunkTitle}`} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
              <BookOpenCheck className="h-4 w-4 text-primary" />
              {citation.kbTitle}
            </div>
            <div className="mt-2 text-sm text-zinc-300">{citation.chunkTitle}</div>
            <div className="mt-2 text-xs text-zinc-500">Similarity {citation.score.toFixed(2)}</div>
            <pre className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-zinc-950 p-3 text-xs leading-5 text-zinc-400">
              {citation.excerpt}
            </pre>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
