import Link from "next/link";
import { escalationService } from "@/services/escalationService";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function EscalationsPage() {
  await requireSection("support");
  const escalations = await escalationService.listAll();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Escalations</h1>
      <p className="mt-1 text-sm text-muted">Every escalation on record — why, from where, to whom.</p>

      <div className="mt-6 space-y-2">
        {escalations.map((e) => (
          <Link key={e.id} href={`/admin/support/tickets/${e.ticketId}`} className="block rounded-2xl border border-border bg-surface p-4 hover:border-primary">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-ink">{e.reason.replace(/_/g, " ")}</span>
              <span className="text-xs text-muted">{new Date(e.createdAt).toLocaleString("en-GB")}</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {e.previousDepartmentName ?? "—"} → {e.newDepartmentName ?? "—"} · {e.previousAssigneeName ?? "Unassigned"} → {e.newAssigneeName ?? "Unassigned"}
            </p>
            {e.notes && <p className="mt-1 text-xs text-ink">{e.notes}</p>}
          </Link>
        ))}
        {escalations.length === 0 && <p className="text-sm text-muted">No escalations yet.</p>}
      </div>
    </div>
  );
}
