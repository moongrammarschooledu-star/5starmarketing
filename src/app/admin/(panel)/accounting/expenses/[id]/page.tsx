import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { expenseService } from "@/services/expenseService";
import { financialAuditService } from "@/services/financialAuditService";
import { profileService } from "@/services/profileService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ExpenseDetailActions } from "@/components/admin/accounting/ExpenseDetailActions";
import { canManageFinance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { formatPKR } from "@/lib/calculator";
import { formatDateOnly } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("accounting");
  const { id } = await params;
  const [expense, admin] = await Promise.all([expenseService.getById(id), profileService.getCurrentAdmin()]);
  if (!expense) notFound();
  const auditLog = await financialAuditService.listForEntity("expense", id);
  const canManage = admin ? canManageFinance(admin.role) : false;

  return (
    <div>
      <Link href="/admin/accounting/expenses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Expenses
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{expense.expenseNumber}</h1>
          <p className="mt-1 text-sm text-muted">{expense.description}</p>
        </div>
        <StatusBadge status={expense.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-heading text-base font-bold text-ink">Details</h2>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Field label="Amount" value={formatPKR(expense.amount)} />
              <Field label="Date" value={formatDateOnly(expense.expenseDate)} />
              <Field label="Category" value={expense.accountName || "—"} />
              <Field label="Vendor" value={expense.vendor || "—"} />
              <Field label="Payment Method" value={expense.paymentMethod || "—"} />
              <Field label="Reference" value={expense.referenceNumber || "—"} />
              <Field label="Property" value={expense.propertyTitle || "—"} />
              <Field label="Project" value={expense.projectName || "—"} />
              <Field label="Deal" value={expense.dealNumber || "—"} />
              <Field label="Agent" value={expense.agentName || "—"} />
              <Field label="Submitted By" value={expense.submittedByName || "—"} />
              <Field label="Approved By" value={expense.approvedByName || "—"} />
            </dl>
            {expense.notes && (
              <div className="mt-4 rounded-lg bg-surface-muted p-3 text-sm text-ink">
                <span className="font-semibold">Notes: </span>
                {expense.notes}
              </div>
            )}
          </div>

          <ExpenseDetailActions expense={expense} canManage={canManage} />

          {auditLog.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <h3 className="font-heading text-sm font-bold text-ink">Activity</h3>
              <ol className="mt-3 space-y-2 border-l-2 border-border pl-4">
                {auditLog.map((a) => (
                  <li key={a.id} className="relative text-xs">
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                    <span className="font-semibold text-ink">{a.action}</span>
                    <span className="text-muted-foreground"> — {a.actorName ?? "System"} · {new Date(a.createdAt).toLocaleString("en-GB")}</span>
                    {a.reason && <p className="mt-0.5 text-muted">{a.reason}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}
