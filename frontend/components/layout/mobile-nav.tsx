"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarInner } from "@/components/layout/sidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Portal target is only available on the client.
  useEffect(() => setMounted(true), []);

  // Close the drawer whenever the route changes so a tapped nav link never
  // leaves the drawer hanging open over the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open navigation</span>
      </Button>
      {mounted && open
        ? createPortal(
            // Portaled to <body> so it escapes the top bar's backdrop-filter
            // containing block (which otherwise traps `fixed` to the 64px bar).
            <div className="fixed inset-0 z-[60] lg:hidden">
              <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
              <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto border-r border-border bg-card p-6">
                <Button variant="ghost" size="icon" className="absolute right-3 top-3" onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close navigation</span>
                </Button>
                <SidebarInner onNavigate={() => setOpen(false)} />
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
