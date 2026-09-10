import { Boxes } from "lucide-react";

interface TypeSummary {
  unitType: string;
  total: number;
  available: number;
  booked: number;
  sold: number;
  rented: number;
}

/** Aggregate-only public inventory availability (STEP 19, section 41) —
 *  counts only, never a customer name, deal value, payment detail or
 *  agent note. Nothing renders when there's no real inventory data. */
export function PublicInventorySummary({ summary }: { summary: TypeSummary[] }) {
  if (summary.length === 0) return null;

  return (
    <div>
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <Boxes className="h-4.5 w-4.5 text-primary" /> Unit Availability
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {summary.map((s) => (
          <div key={s.unitType} className="rounded-xl border border-border bg-surface-muted p-4">
            <div className="font-bold text-ink">{s.unitType}</div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <span>
                <span className="font-bold text-success">{s.available}</span> Available
              </span>
              {s.booked > 0 && (
                <span>
                  <span className="font-bold text-primary">{s.booked}</span> Booked
                </span>
              )}
              {s.sold > 0 && (
                <span>
                  <span className="font-bold text-ink">{s.sold}</span> Sold
                </span>
              )}
              {s.rented > 0 && (
                <span>
                  <span className="font-bold text-ink">{s.rented}</span> Rented
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
