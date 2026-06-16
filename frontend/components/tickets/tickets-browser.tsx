"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { TicketModal } from "@/components/tickets/ticket-modal";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ModalRun, RunSource } from "@/components/tickets/ticket-modal";
import type { TicketRow } from "@/lib/run-rows";

const PAGE_SIZE = 25;

const sourceBadge: Record<RunSource, { label: string; variant: "default" | "outline" | "resolved" }> = {
  canonical: { label: "DEMO", variant: "outline" },
  live: { label: "LIVE", variant: "default" },
  burst: { label: "BURST", variant: "default" },
  seed: { label: "SAMPLE", variant: "outline" }
};

type SourceFilter = "all" | "real" | "sample";

function SelectFilter({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-500">
      <span className="uppercase tracking-[0.14em]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-border bg-zinc-950 px-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TicketsBrowser({ rows }: { rows: TicketRow[] }) {
  const router = useRouter();
  const [category, setCategory] = React.useState("all");
  const [routing, setRouting] = React.useState("all");
  const [source, setSource] = React.useState<SourceFilter>("all");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [active, setActive] = React.useState<ModalRun | null>(null);

  const categories = React.useMemo(
    () => Array.from(new Set(rows.map((r) => r.category).filter(Boolean))).sort(),
    [rows]
  );
  const routings = React.useMemo(
    () => Array.from(new Set(rows.map((r) => r.routing).filter(Boolean))).sort(),
    [rows]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = rows.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (routing !== "all" && r.routing !== routing) return false;
      if (source === "real" && r.source === "seed") return false;
      if (source === "sample" && r.source !== "seed") return false;
      if (q && !`${r.label} ${r.subject}`.toLowerCase().includes(q)) return false;
      return true;
    });
    // Newest first by date. Canonical rows (no date) sort last.
    return result.sort((a, b) => {
      if (a.dateISO && b.dateISO) return b.dateISO.localeCompare(a.dateISO);
      if (a.dateISO) return -1;
      if (b.dateISO) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [rows, category, routing, source, query]);

  // Reset to first page whenever the filter set changes.
  React.useEffect(() => {
    setPage(0);
  }, [category, routing, source, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const hasFilters = category !== "all" || routing !== "all" || source !== "all" || query.trim() !== "";

  const clearFilters = () => {
    setCategory("all");
    setRouting("all");
    setSource("all");
    setQuery("");
  };

  // Prefetch the visible canonical detail routes for snappy navigation.
  React.useEffect(() => {
    for (const row of visible) {
      if (row.detailHref) router.prefetch(row.detailHref);
    }
  }, [visible, router]);

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs text-zinc-500">
            <span className="uppercase tracking-[0.14em]">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by label or subject…"
                className="h-9 w-full rounded-md border border-border bg-zinc-950 pl-8 pr-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </label>

          <SelectFilter
            label="Category"
            value={category}
            onChange={setCategory}
            options={[{ value: "all", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]}
          />
          <SelectFilter
            label="Outcome"
            value={routing}
            onChange={setRouting}
            options={[{ value: "all", label: "All outcomes" }, ...routings.map((r) => ({ value: r, label: r }))]}
          />
          <SelectFilter
            label="Source"
            value={source}
            onChange={(v) => setSource(v as SourceFilter)}
            options={[
              { value: "all", label: "All sources" },
              { value: "real", label: "Real (demo + live + burst)" },
              { value: "sample", label: "Sample history" }
            ]}
          />

          {hasFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            showing {filtered.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length.toLocaleString()} filtered · {rows.length.toLocaleString()} total
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Routing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => {
              const badge = sourceBadge[row.source];
              // Canonical rows → navigate to their detail page. Store rows → modal.
              const onClick = () => {
                if (row.detailHref) router.push(row.detailHref);
                else if (row.modal) setActive(row.modal);
              };
              return (
                <TableRow key={row.key} onClick={onClick} className="cursor-pointer hover:bg-zinc-900/60">
                  <TableCell className="font-medium text-zinc-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{row.label}</span>
                      <Badge variant={badge.variant} className="text-[10px]">
                        {badge.label}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-72 text-zinc-300">{row.subject}</TableCell>
                  <TableCell className="text-zinc-400">{row.category || "—"}</TableCell>
                  <TableCell className="text-zinc-400">
                    {row.status === "escalated" ? (
                      <Badge variant="escalated" className="text-[10px]">
                        ESCALATED
                      </Badge>
                    ) : (
                      row.routingLabel
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-zinc-400">{formatCurrency(row.cost)}</TableCell>
                  <TableCell className="text-zinc-500">
                    {row.dateISO ? formatDate(row.dateISO) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-zinc-500">
                  No tickets match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            page {safePage + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      <TicketModal run={active} onClose={() => setActive(null)} />
    </Card>
  );
}
