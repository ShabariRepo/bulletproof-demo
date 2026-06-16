import { MobileNav } from "@/components/layout/mobile-nav";
import { Badge } from "@/components/ui/badge";

export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-5 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <MobileNav />
        <h1 className="truncate text-base font-semibold text-zinc-100 lg:text-lg">{title}</h1>
      </div>
      <Badge variant="outline" className="hidden shrink-0 whitespace-nowrap border-primary/40 text-zinc-300 xs:inline-flex">
        Made on Bonito
      </Badge>
    </header>
  );
}
