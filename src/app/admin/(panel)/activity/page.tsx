import { activityService } from "@/services/activityService";
import { formatDateOnlyShort } from "@/lib/date";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminActivityPage() {
  await requireSection("activity");
  let entries: Awaited<ReturnType<typeof activityService.recentFeed>> = [];
  let loadError: string | null = null;
  try {
    entries = await activityService.recentFeed(100);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the activity log.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Admin Activity Log</h1>
      <p className="mt-1 text-sm text-muted">Every property, project and lead change, plus new leads received.</p>

      {loadError && (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          {loadError}
        </div>
      )}

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-border bg-surface lg:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted">
                  No activity yet.
                </td>
              </tr>
            )}
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{formatTimestamp(e.createdAt)}</td>
                <td className="px-4 py-3 font-semibold text-ink">{e.adminName}</td>
                <td className="px-4 py-3 text-ink">{e.action}</td>
                <td className="px-4 py-3 text-muted">{e.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-6 space-y-3 lg:hidden">
        {entries.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">No activity yet.</p>
        )}
        {entries.map((e) => (
          <div key={e.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink">{e.action}</span>
              <span className="text-xs text-muted-foreground">{formatDateOnlyShort(e.createdAt.slice(0, 10))}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{e.description}</p>
            <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">{e.adminName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
