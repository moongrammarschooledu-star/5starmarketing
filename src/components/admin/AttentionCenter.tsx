import Link from "next/link";
import { AlertCircle, ChevronRight } from "lucide-react";
import type { AttentionItem } from "@/lib/models/analytics";

export function AttentionCenter({ items }: { items: AttentionItem[] }) {
  const active = items.filter((i) => i.count > 0);
  if (active.length === 0) {
    return (
      <div className="rounded-2xl border border-success/20 bg-success/5 p-5 text-sm font-semibold text-success">
        Nothing needs attention right now — everything looks good.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
        <AlertCircle className="h-4.5 w-4.5 text-primary" /> Needs Attention
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {active.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary"
          >
            <span>{item.label}</span>
            <span className="flex items-center gap-1">
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {item.count}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
