"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarInner } from "@/components/layout/sidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open navigation</span>
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] border-r border-border bg-card p-6">
            <Button variant="ghost" size="icon" className="absolute right-3 top-3" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close navigation</span>
            </Button>
            <SidebarInner />
          </div>
        </div>
      ) : null}
    </>
  );
}
