import { MobileNav } from "@/components/layout/mobile-nav";
import { Badge } from "@/components/ui/badge";

export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <MobileNav />
        <h1 className="text-base font-semibold text-zinc-100 lg:text-lg">{title}</h1>
      </div>
      <Badge variant="outline" className="border-primary/40 text-zinc-300">
        Made on Bonito
      </Badge>
    </header>
  );
}
