import Link from "next/link";
import { ticketService } from "@/services/ticketService";
import { supportCategoryService } from "@/services/supportCategoryService";
import { supportDepartmentService } from "@/services/supportDepartmentService";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { NewTicketForm } from "@/components/support/NewTicketForm";
import { supportTicketStatuses, supportTicketPriorities } from "@/lib/models/support";
import type { SupportTicketStatus, SupportTicketPriority } from "@/lib/models/support";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; departmentId?: string; propertyId?: string; q?: string; page?: string; excludeComplaints?: string }>;
}) {
  await requireSection("support");
  const sp = await searchParams;
  const [categories, departments] = await Promise.all([supportCategoryService.list(true), supportDepartmentService.list(true)]);
  const { tickets, total } = await ticketService.list({
    status: sp.status as SupportTicketStatus | undefined,
    priority: sp.priority as SupportTicketPriority | undefined,
    departmentId: sp.departmentId,
    propertyId: sp.propertyId,
    q: sp.q,
    page: sp.page ? Number(sp.page) : 1,
    pageSize: 25,
  });
  const filtered = sp.excludeComplaints ? tickets.filter((t) => t.categoryCode !== "COMPLAINT") : tickets;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-ink">{sp.excludeComplaints ? "Support Requests" : "Support Tickets"}</h1>
      </div>

      <details className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-bold text-ink">+ New Ticket (on behalf of a customer)</summary>
        <div className="mt-3">
          <NewTicketForm categories={categories} mode="staff" />
        </div>
      </details>

      <form className="mt-4 flex flex-wrap items-center gap-2" action="/admin/support/tickets">
        <input name="q" defaultValue={sp.q} placeholder="Search ticket # or subject" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
        <select name="status" defaultValue={sp.status ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
          <option value="">All Statuses</option>
          {supportTicketStatuses.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select name="priority" defaultValue={sp.priority ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
          <option value="">All Priorities</option>
          {supportTicketPriorities.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select name="departmentId" defaultValue={sp.departmentId ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-full border border-border px-3 py-2 text-xs font-bold text-ink hover:bg-surface-muted">
          Filter
        </button>
        <a href={`/admin/support/tickets/export?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString()}`} className="rounded-full border border-border px-3 py-2 text-xs font-bold text-ink hover:bg-surface-muted">
          Export CSV
        </a>
      </form>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[840px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Ticket #</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/support/tickets/${t.id}`} className="font-semibold text-primary hover:underline">
                    {t.ticketNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{t.subject}</td>
                <td className="px-4 py-3 text-muted">{t.customerName ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{t.departmentName ?? "Unassigned"}</td>
                <td className="px-4 py-3 text-muted">{t.assignedStaffName ?? "Unassigned"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.priority} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                  {(t.slaResponseBreached || t.slaResolutionBreached) && <span className="ml-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">SLA</span>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  No tickets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">{total} total ticket(s).</p>
    </div>
  );
}
