import Link from "next/link";
import type { InventoryUnit, InventoryStatus } from "@/lib/models/inventory";

const TONE: Record<InventoryStatus, string> = {
  AVAILABLE: "border-success/40 bg-success/10 text-success",
  RESERVED: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  BOOKED: "border-primary/40 bg-primary/10 text-primary",
  SOLD: "border-success/50 bg-success/20 text-success",
  RENTED: "border-primary/30 bg-primary/5 text-primary",
  UNDER_CONSTRUCTION: "border-ink/20 bg-ink/5 text-ink",
  COMING_SOON: "border-burgundy/30 bg-burgundy/5 text-burgundy",
  BLOCKED: "border-muted/30 bg-muted/10 text-muted",
};

/** Visual plot/grid view (sections 23/42) — status is distinguished by
 *  BOTH color and a short text label on every tile, never color alone,
 *  and horizontally scrolls on small screens without breaking the page
 *  (section 60). Grouped by Block; real data only. */
export function InventoryPlotGrid({ units }: { units: InventoryUnit[] }) {
  if (units.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">No inventory in this project yet.</p>;
  }

  const groups = new Map<string, InventoryUnit[]>();
  for (const u of units) {
    const key = u.block || "Ungrouped";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(u);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([block, blockUnits]) => (
        <div key={block}>
          {block !== "Ungrouped" && <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Block {block}</h3>}
          <div className="overflow-x-auto pb-1">
            <div className="flex flex-wrap gap-2">
              {blockUnits.map((u) => (
                <Link
                  key={u.id}
                  href={`/admin/inventory/${u.id}`}
                  title={`${u.unitNumber} — ${u.status}`}
                  className={`flex w-24 shrink-0 flex-col items-center justify-center rounded-xl border-2 p-2.5 text-center text-xs font-bold transition-transform hover:-translate-y-0.5 ${TONE[u.status]}`}
                >
                  <span className="truncate">{u.unitNumber}</span>
                  <span className="mt-1 text-[10px] font-extrabold uppercase tracking-wide">{u.status}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
