import Link from "next/link";
import type { InventoryUnit } from "@/lib/models/inventory";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

/** The plain unit/type/size/price/status matrix (section 21), grouped
 *  by Building then Floor when those are set (section 22) — real
 *  database values only, never demo rows for an empty project. */
export function InventoryMatrix({ units }: { units: InventoryUnit[] }) {
  if (units.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">No inventory in this project yet.</p>;
  }

  const groups = new Map<string, InventoryUnit[]>();
  for (const u of units) {
    const key = [u.building, u.floor && `Floor ${u.floor}`].filter(Boolean).join(" — ") || "All Units";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(u);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([group, groupUnits]) => (
        <div key={group} className="overflow-x-auto rounded-2xl border border-border bg-surface">
          {group !== "All Units" && <div className="border-b border-border bg-surface-muted px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink">{group}</div>}
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5">Unit</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Size</th>
                <th className="px-4 py-2.5">Price</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {groupUnits.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                  <td className="px-4 py-2.5 font-semibold text-ink">
                    <Link href={`/admin/inventory/${u.id}`} className="hover:text-primary">
                      {u.unitNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{u.unitType}</td>
                  <td className="px-4 py-2.5 text-muted">{u.area ? `${u.area} ${u.areaUnit ?? ""}` : "—"}</td>
                  <td className="px-4 py-2.5 text-ink">{u.price ? formatPKR(u.price) : "—"}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={u.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
