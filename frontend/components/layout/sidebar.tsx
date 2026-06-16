import Link from "next/link";
import { navItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("hidden w-72 shrink-0 self-start sticky top-0 h-screen overflow-y-auto border-r border-border bg-background px-5 py-6 lg:block", className)}>
      <SidebarInner />
    </aside>
  );
}

export function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={onNavigate} className="mb-10 block">
        <div className="text-xl font-semibold tracking-normal text-zinc-50">Kevlar</div>
        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">Bulletproof Tier 1</div>
      </Link>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium text-zinc-200">Phase 0-4 local demo</div>
        <p className="mt-2 text-xs leading-5 text-zinc-500">Mock mode works locally. Save credentials in Settings to attempt live Bonito and Halo calls.</p>
      </div>
    </div>
  );
}
