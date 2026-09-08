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
  "Follow-up": "bg-success/10 text-success",
  Closed: "bg-muted/20 text-muted",
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
