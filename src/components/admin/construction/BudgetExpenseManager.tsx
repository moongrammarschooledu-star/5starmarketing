"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertTriangle } from "lucide-react";
import type { ConstructionBudgetLine, BudgetLineSummary, ConstructionExpense, ConstructionExpenseInput, BudgetCategory, ConstructionExpenseStatus } from "@/lib/models/construction";
import { budgetCategories, constructionExpenseStatuses } from "@/lib/models/construction";
import { upsertBudgetLineAction, createConstructionExpenseAction, updateConstructionExpenseStatusAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function BudgetExpenseManager({
  projectId,
  lines,
  summary,
  expenses,
  alerts,
  phases,
  contractors,
  vendors,
  canManage,
}: {
  projectId: string;
  lines: ConstructionBudgetLine[];
  summary: BudgetLineSummary[];
  expenses: ConstructionExpense[];
  alerts: { category: string; percentUsed: number; thresholdCrossed: number }[];
  phases: { id: string; name: string }[];
  contractors: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  canManage: boolean;
}) {
  return (
    <div className="mt-3 space-y-8">
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.category} className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {a.category} budget has used {a.percentUsed}% (crossed {a.thresholdCrossed}% alert threshold).
            </div>
          ))}
        </div>
      )}

      <section>
        <h3 className="font-heading text-base font-bold text-ink">Budget by Category</h3>
        <p className="mt-1 text-xs text-muted">Committed/actual/remaining/variance are always computed live from real purchase orders, work orders and paid expenses — never stored.</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Budgeted</th>
                <th className="px-3 py-2.5">Committed</th>
                <th className="px-3 py-2.5">Actual</th>
                <th className="px-3 py-2.5">Remaining</th>
                <th className="px-3 py-2.5">Variance</th>
              </tr>
            </thead>
            <tbody>
              {budgetCategories.map((cat) => {
                const line = lines.find((l) => l.category === cat);
                const s = summary.find((x) => x.category === cat);
                return <BudgetLineRow key={cat} projectId={projectId} category={cat} budgetedAmount={line?.budgetedAmount} summary={s} canManage={canManage} />;
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="font-heading text-base font-bold text-ink">Expenses</h3>
        <AddExpenseForm projectId={projectId} phases={phases} contractors={contractors} vendors={vendors} />
        <div className="mt-3 space-y-2">
          {expenses.map((e) => (
            <ExpenseRow key={e.id} projectId={projectId} expense={e} canManage={canManage} />
          ))}
          {expenses.length === 0 && <p className="text-sm text-muted">No expenses recorded yet.</p>}
        </div>
      </section>
    </div>
  );
}

function BudgetLineRow({
  projectId,
  category,
  budgetedAmount,
  summary,
  canManage,
}: {
  projectId: string;
  category: BudgetCategory;
  budgetedAmount?: number;
  summary?: BudgetLineSummary;
  canManage: boolean;
}) {
  const [value, setValue] = useState(budgetedAmount?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function save() {
    const amount = Number(value);
    if (!value || Number.isNaN(amount) || amount < 0 || amount === (budgetedAmount ?? -1)) return;
    startTransition(async () => {
      try {
        await upsertBudgetLineAction(projectId, { category, budgetedAmount: amount });
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not save this budget line.");
      }
    });
  }

  const remaining = summary?.remainingAmount ?? (budgetedAmount ?? 0);
  const variance = summary?.varianceAmount ?? 0;

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2.5 font-medium text-ink">{category}</td>
      <td className="px-3 py-2.5">
        {canManage ? (
          <input type="number" value={value} onChange={(e) => setValue(e.target.value)} onBlur={save} disabled={isPending} className="w-28 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary" />
        ) : (
          formatPKR(budgetedAmount ?? 0)
        )}
      </td>
      <td className="px-3 py-2.5 text-muted">{formatPKR(summary?.committedAmount ?? 0)}</td>
      <td className="px-3 py-2.5 text-muted">{formatPKR(summary?.actualAmount ?? 0)}</td>
      <td className={`px-3 py-2.5 font-semibold ${remaining < 0 ? "text-red-600" : "text-ink"}`}>{formatPKR(remaining)}</td>
      <td className={`px-3 py-2.5 font-semibold ${variance > 0 ? "text-red-600" : "text-ink"}`}>{formatPKR(variance)}</td>
    </tr>
  );
}

function AddExpenseForm({
  projectId,
  phases,
  contractors,
  vendors,
}: {
  projectId: string;
  phases: { id: string; name: string }[];
  contractors: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
}) {
  const [form, setForm] = useState<Partial<ConstructionExpenseInput>>({ category: "Other" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof ConstructionExpenseInput>(key: K, value: ConstructionExpenseInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.description?.trim() || !form.amount) {
      toast.show("Please enter a description and amount.");
      return;
    }
    startTransition(async () => {
      try {
        await createConstructionExpenseAction(projectId, form as ConstructionExpenseInput);
        toast.show("Expense created as draft.");
        setForm({ category: "Other" });
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this expense.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h4 className="text-sm font-bold text-ink">Add Expense</h4>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select value={form.category ?? "Other"} onChange={(e) => set("category", e.target.value as BudgetCategory)} className={inputClass}>
          {budgetCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={form.phaseId ?? ""} onChange={(e) => set("phaseId", e.target.value)} className={inputClass}>
          <option value="">No phase</option>
          {phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input type="number" placeholder="Amount" value={form.amount ?? ""} onChange={(e) => set("amount", Number(e.target.value))} className={inputClass} />
        <select value={form.vendorId ?? ""} onChange={(e) => set("vendorId", e.target.value)} className={inputClass}>
          <option value="">No vendor</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <select value={form.contractorId ?? ""} onChange={(e) => set("contractorId", e.target.value)} className={inputClass}>
          <option value="">No contractor</option>
          {contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input placeholder="Description" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} className={`${inputClass} sm:col-span-3`} />
      </div>
      <button type="button" onClick={create} disabled={isPending} className="mt-3 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
        <Plus className="h-3.5 w-3.5" /> Add Expense
      </button>
    </div>
  );
}

function ExpenseRow({ projectId, expense, canManage }: { projectId: string; expense: ConstructionExpense; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const nextOptions = constructionExpenseStatuses.filter((s) => s === expense.status || isNextAllowed(expense.status, s));

  function isNextAllowed(from: ConstructionExpenseStatus, to: ConstructionExpenseStatus) {
    const map: Record<ConstructionExpenseStatus, ConstructionExpenseStatus[]> = { DRAFT: ["SUBMITTED"], SUBMITTED: ["APPROVED", "REJECTED"], APPROVED: ["PAID"], REJECTED: [], PAID: [] };
    return map[from].includes(to);
  }

  function setStatus(status: ConstructionExpenseStatus) {
    const requiresManage = status === "APPROVED" || status === "PAID";
    if (requiresManage && !canManage) {
      toast.show("Only construction managers can approve or mark expenses as paid.");
      return;
    }
    startTransition(async () => {
      try {
        await updateConstructionExpenseStatusAction(expense.id, projectId, status);
        toast.show(`Expense moved to ${status}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this expense.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">{expense.description}</p>
          <p className="text-xs text-muted">
            {expense.category} {expense.phaseName ? `· ${expense.phaseName}` : ""} {expense.vendorName ? `· ${expense.vendorName}` : ""} {expense.contractorName ? `· ${expense.contractorName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-ink">{formatPKR(expense.amount)}</span>
          <StatusBadge status={expense.status} />
        </div>
      </div>
      <div className="mt-2">
        <select value={expense.status} onChange={(e) => setStatus(e.target.value as ConstructionExpenseStatus)} disabled={isPending} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary">
          {nextOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
