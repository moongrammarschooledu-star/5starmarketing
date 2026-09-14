import { legalReportService } from "@/services/legalReportService";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function LegalEventsPage() {
  await requireSection("legal");
  const from = new Date();
  from.setDate(from.getDate() - 14);
  const to = new Date();
  to.setDate(to.getDate() + 90);
  const entries = await legalReportService.calendar(from.toISOString().slice(0, 10), to.toISOString().slice(0, 10));

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Legal Calendar</h1>
      <p className="mt-1 text-sm text-muted">Assembled live from real dates on real records — 14 days back through 90 days ahead. Nothing here is a fabricated event.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={`${entry.entityId}-${i}`} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3 font-semibold text-ink">{entry.date}</td>
                <td className="px-4 py-3 text-muted">{entry.type.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-muted">{entry.label}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-muted">
                  Nothing scheduled in this window.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
