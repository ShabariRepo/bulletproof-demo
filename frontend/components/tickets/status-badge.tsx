import { Badge } from "@/components/ui/badge";
import type { TicketStatus } from "@/types/demo";

const labels: Record<TicketStatus, string> = {
  resolved: "Resolved",
  "in-progress": "In progress",
  escalated: "Escalated",
  queued: "Queued"
};

const variants: Record<TicketStatus, "resolved" | "progress" | "escalated" | "queued"> = {
  resolved: "resolved",
  "in-progress": "progress",
  escalated: "escalated",
  queued: "queued"
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
