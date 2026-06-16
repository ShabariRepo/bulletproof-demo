import { Activity, BookOpen, Cable, CalendarDays, LayoutDashboard, Settings, Ticket } from "lucide-react";

export const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard
  },
  {
    href: "/simulate",
    label: "Live Sim",
    icon: Activity
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: CalendarDays
  },
  {
    href: "/tickets/BP-001",
    label: "Tickets",
    icon: Ticket
  },
  {
    href: "/knowledge-bases",
    label: "KBs",
    icon: BookOpen
  },
  {
    href: "/integrations",
    label: "Integrations",
    icon: Cable
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings
  }
];
