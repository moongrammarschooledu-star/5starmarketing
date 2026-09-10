import Link from "next/link";
import { AlertTriangle, FolderKanban } from "lucide-react";
import { inventoryService } from "@/services/inventoryService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function ProjectInventoryDashboardPage() {
  await requireSection("inventory");

  let summaries: Awaited<ReturnType<typeof inventoryService.projectSummaries>> = [];
  let loadError: string | null = null;
  try {
    summaries = await inventoryService.projectSummaries();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load project inventory.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Project Inventory</h1>
      <p className="mt-1 text-sm text-muted">Every project with structured unit inventory — real counts, live status.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      {!loadError && summaries.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-heading text-base font-bold text-ink">No project inventory yet.</p>
        </div>
      )}

      {summaries.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Total Units</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3">Reserved</th>
                <th className="px-4 py-3">Booked</th>
                <th className="px-4 py-3">Sold</th>
                <th className="px-4 py-3">Rented</th>
                <th className="px-4 py-3">Completion</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr key={s.projectId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">{s.projectName}</td>
                  <td className="px-4 py-3 text-ink">{s.total}</td>
                  <td className="px-4 py-3 text-success">{s.available}</td>
                  <td className="px-4 py-3 text-muted">{s.reserved}</td>
                  <td className="px-4 py-3 text-muted">{s.booked}</td>
                  <td className="px-4 py-3 text-muted">{s.sold}</td>
                  <td className="px-4 py-3 text-muted">{s.rented}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.projectStatus} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/inventory/projects/${s.projectId}`} className="text-xs font-bold text-primary hover:underline">
                      View Inventory
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
