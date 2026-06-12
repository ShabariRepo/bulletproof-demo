import { KnowledgeBaseExplorer } from "@/components/knowledge-base-explorer";
import { getKnowledgeBases } from "@/lib/demo-data";

export default function KnowledgeBasesPage() {
  const knowledgeBases = getKnowledgeBases();

  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Knowledge operations</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-50">KB Explorer</h2>
        <p className="mt-3 text-base leading-7 text-zinc-500">
          Browse the local Bulletproof knowledge bases attached to the Phase 0 specialist agents.
        </p>
      </section>
      <KnowledgeBaseExplorer knowledgeBases={knowledgeBases} />
    </div>
  );
}
