import Link from "next/link";
import type { PropertyPerformanceRow } from "@/lib/models/analytics";
import { StatusBadge } from "./StatusBadge";

export function PropertyPerformanceTable({ rows }: { rows: PropertyPerformanceRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
        No tracked property activity yet for this period.
      </div>
    );
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface lg:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Inquiries</th>
              <th className="px-4 py-3">WhatsApp Clicks</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.propertyId} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/properties/${r.propertyId}/edit`} className="font-semibold text-ink hover:text-primary">
                    {r.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{r.views}</td>
                <td className="px-4 py-3 text-muted">{r.inquiries}</td>
                <td className="px-4 py-3 text-muted">{r.whatsappClicks}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {rows.map((r) => (
          <Link
            key={r.propertyId}
            href={`/admin/properties/${r.propertyId}/edit`}
            className="block rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-ink">{r.title}</span>
              <StatusBadge status={r.status} />
            </div>
            <div className="mt-2.5 flex gap-4 text-xs text-muted">
              <span>{r.views} views</span>
              <span>{r.inquiries} inquiries</span>
              <span>{r.whatsappClicks} WhatsApp clicks</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
