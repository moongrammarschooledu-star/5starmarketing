import Link from "next/link";
import { complaintService } from "@/services/complaintService";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ComplaintsPage() {
  await requireSection("support");
  const complaints = await complaintService.list();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Complaints</h1>
      <p className="mt-1 text-sm text-muted">Investigation results and resolutions are only ever entered by an authorized user — never fabricated.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Complaint #</th>
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Officer</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3 font-semibold text-ink">{c.complaintNumber}</td>
                <td className="px-4 py-3 text-muted">
                  <Link href={`/admin/support/tickets/${c.ticketId}`} className="text-primary hover:underline">
                    {c.ticketNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.severity} />
                </td>
                <td className="px-4 py-3 text-muted">{c.assignedOfficerName ?? "Unassigned"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
              </tr>
            ))}
            {complaints.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                  No complaints filed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
