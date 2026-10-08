import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ClipboardCheck, PlusCircle, Sparkles, Handshake, XCircle } from "lucide-react";
import { demandService } from "@/services/demandService";
import { requireSection } from "@/lib/guard";
import { StatCard } from "@/components/admin/StatCard";
import { describeBudget, describeSize } from "@/lib/demandText";
import { formatDateOnlyShort } from "@/lib/date";
import { demandStatuses, type DemandStatus, type PropertyDemand } from "@/lib/models/demand";

export const metadata: Metadata = { title: "Demands" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<DemandStatus, string> = {
  Open: "bg-primary/10 text-primary",
  Matched: "bg-success/10 text-success",
  Closed: "bg-ink/10 text-ink",
  Lost: "bg-muted/20 text-muted",
};

const PRIORITY_TONE: Record<string, string> = {
  Urgent: "text-primary",
  High: "text-amber-600",
  Normal: "text-muted",
  Low: "text-muted",
};

export default async function AdminDemandsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireSection("demands");
  const sp = await searchParams;
  const status = demandStatuses.find((s) => s === sp.status);

  let all: PropertyDemand[] = [];
  let counts = new Map<string, { total: number; good: number }>();
  let loadError: string | null = null;
  try {
    all = await demandService.list();
    counts = await demandService.matchCounts(all);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the demands.";
  }

  const shown = status ? all.filter((d) => d.status === status) : all;
  const tally = (s: DemandStatus) => all.filter((d) => d.status === s).length;
  const waitingWithMatch = all.filter((d) => (d.status === "Open" || d.status === "Matched") && (counts.get(d.id)?.good ?? 0) > 0).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Demands</h1>
          <p className="mt-1 text-sm text-muted">What each client is looking for, matched with the properties we have. Private - never shown on the website.</p>
        </div>
        <Link href="/admin/demands/new" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <PlusCircle className="h-4 w-4" /> Add Demand
        </Link>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Waiting" value={tally("Open") + tally("Matched")} icon={ClipboardCheck} tone="primary" />
        <StatCard label="With a good match" value={waitingWithMatch} icon={Sparkles} tone="success" />
        <StatCard label="Closed" value={tally("Closed")} icon={Handshake} />
        <StatCard label="Lost" value={tally("Lost")} icon={XCircle} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {[undefined, ...demandStatuses].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/demands?status=${s}` : "/admin/demands"}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${status === s ? "bg-ink text-white" : "border border-border text-ink hover:bg-surface-muted"}`}
          >
            {s ?? "All"} ({s ? tally(s) : all.length})
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Looking for</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Matches</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Added</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  {all.length === 0 ? "No demands yet. Add the first one when a client asks for a property." : "No demands with this status."}
                </td>
              </tr>
            )}
            {shown.map((d) => {
              const c = counts.get(d.id);
              return (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/demands/${d.id}`} className="font-semibold text-ink hover:text-primary">
                      {d.clientName}
                    </Link>
                    <div className="text-xs text-muted">{d.clientPhone}</div>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    <div>
                      {d.purpose === "For Sale" ? "Buy" : "Rent"} - {d.propertyTypes.length ? d.propertyTypes.join(", ") : "any type"}
                    </div>
                    <div className="text-xs text-muted">{d.locations.length ? d.locations.join(", ") : "Anywhere"}</div>
                  </td>
                  <td className="px-4 py-3 text-ink">{describeBudget(d)}</td>
                  <td className="px-4 py-3 text-ink">{describeSize(d)}</td>
                  <td className="px-4 py-3">
                    {c && c.total > 0 ? (
                      <Link href={`/admin/demands/${d.id}`} className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
                        <Sparkles className="h-3 w-3" /> {c.good > 0 ? `${c.good} good` : `${c.total} possible`}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted">None yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[d.status]}`}>{d.status}</span>
                    {(d.priority === "Urgent" || d.priority === "High") && <div className={`mt-1 text-xs font-bold ${PRIORITY_TONE[d.priority]}`}>{d.priority}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted">{d.assignedToName ?? "-"}</td>
                  <td className="px-4 py-3 text-muted">{formatDateOnlyShort(d.createdAt.slice(0, 10))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
