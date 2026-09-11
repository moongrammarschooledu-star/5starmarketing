import clsx from "clsx";

const palette: Record<string, string> = {
  Available: "bg-success/10 text-success",
  Reserved: "bg-primary/10 text-primary",
  Sold: "bg-ink/10 text-ink",
  Inactive: "bg-muted/20 text-muted",
  Upcoming: "bg-ink/10 text-ink",
  Ongoing: "bg-primary/10 text-primary",
  Completed: "bg-success/10 text-success",
  New: "bg-primary/10 text-primary",
  Contacted: "bg-ink/10 text-ink",
  Interested: "bg-success/10 text-success",
  "Follow-Up": "bg-amber-500/10 text-amber-600",
  "Site Visit": "bg-burgundy/10 text-burgundy",
  Negotiation: "bg-primary/15 text-primary",
  Closed: "bg-success/15 text-success",
  Lost: "bg-muted/20 text-muted",
  Pending: "bg-primary/10 text-primary",
  Confirmed: "bg-success/10 text-success",
  Rescheduled: "bg-amber-500/10 text-amber-600",
  Cancelled: "bg-muted/20 text-muted",
  "No Show": "bg-muted/20 text-muted",
  // Deals (STEP 18)
  "Booking Pending": "bg-amber-500/10 text-amber-600",
  Booked: "bg-primary/15 text-primary",
  Documentation: "bg-ink/10 text-ink",
  "Payment In Progress": "bg-burgundy/10 text-burgundy",
  Verified: "bg-success/10 text-success",
  Rejected: "bg-primary/10 text-primary",
  Refunded: "bg-muted/20 text-muted",
  Approved: "bg-success/10 text-success",
  "Under Review": "bg-amber-500/10 text-amber-600",
  Paid: "bg-success/15 text-success",
  "Partially Paid": "bg-amber-500/10 text-amber-600",
  Due: "bg-amber-500/10 text-amber-600",
  Overdue: "bg-primary/15 text-primary",
  // Inventory (STEP 19)
  AVAILABLE: "bg-success/10 text-success",
  RESERVED: "bg-amber-500/10 text-amber-600",
  BOOKED: "bg-primary/15 text-primary",
  SOLD: "bg-success/15 text-success",
  RENTED: "bg-primary/10 text-primary",
  UNDER_CONSTRUCTION: "bg-ink/10 text-ink",
  COMING_SOON: "bg-burgundy/10 text-burgundy",
  BLOCKED: "bg-muted/20 text-muted",
  // Documents (STEP 20)
  DRAFT: "bg-muted/20 text-muted",
  UPLOADED: "bg-primary/10 text-primary",
  UNDER_REVIEW: "bg-amber-500/10 text-amber-600",
  VERIFIED: "bg-success/10 text-success",
  APPROVED: "bg-success/15 text-success",
  REJECTED: "bg-primary/15 text-primary",
  EXPIRED: "bg-primary/10 text-primary",
  ARCHIVED: "bg-muted/20 text-muted",
  SUPERSEDED: "bg-muted/20 text-muted",
  // Marketing Automation (STEP 21)
  SUCCESS: "bg-success/10 text-success",
  FAILED: "bg-primary/15 text-primary",
  SKIPPED: "bg-muted/20 text-muted",
  RUNNING: "bg-amber-500/10 text-amber-600",
  COLD: "bg-ink/10 text-ink",
  WARM: "bg-amber-500/10 text-amber-600",
  HOT: "bg-primary/15 text-primary",
  VERY_HOT: "bg-primary/25 text-primary",
  // Communication Center (STEP 22)
  QUEUED: "bg-amber-500/10 text-amber-600",
  SCHEDULED: "bg-primary/10 text-primary",
  SENDING: "bg-amber-500/10 text-amber-600",
  SENT: "bg-success/10 text-success",
  DELIVERED: "bg-success/15 text-success",
  READ: "bg-success/20 text-success",
  CANCELLED: "bg-muted/20 text-muted",
  PROCESSING: "bg-amber-500/10 text-amber-600",
  OPEN: "bg-primary/10 text-primary",
  CLOSED: "bg-muted/20 text-muted",
  LOW: "bg-muted/20 text-muted",
  NORMAL: "bg-ink/10 text-ink",
  HIGH: "bg-amber-500/10 text-amber-600",
  URGENT: "bg-primary/15 text-primary",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold",
        palette[status] ?? "bg-muted/20 text-muted"
      )}
    >
      {status}
    </span>
  );
}
