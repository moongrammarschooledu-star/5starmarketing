import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { demandService } from "@/services/demandService";
import { describeDemand } from "@/lib/demandText";
import type { Property } from "@/lib/models/property";

/** On a property's edit page: the clients who are waiting for something
 *  like it (the other direction of the demand matching). Admin-only. */
export async function PropertyDemandMatches({ property }: { property: Property }) {
  const hits = await demandService.demandsForProperty(property).catch(() => []);
  if (hits.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-success/30 bg-success/5 p-4">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-success">
        <ClipboardCheck className="h-3.5 w-3.5" /> {hits.length} client{hits.length > 1 ? "s are" : " is"} looking for something like this (admin-only)
      </h2>
      <div className="mt-2.5 space-y-1.5">
        {hits.map(({ demand, match }) => (
          <Link key={demand.id} href={`/admin/demands/${demand.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm hover:bg-surface-muted">
            <span>
              <span className="font-semibold text-ink">{demand.clientName}</span>
              <span className="ml-2 text-xs text-muted">{describeDemand(demand)}</span>
            </span>
            <span className="text-xs font-bold text-success">
              {match.score}% {match.level}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
