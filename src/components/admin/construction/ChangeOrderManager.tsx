"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { ConstructionChangeOrder, ConstructionChangeOrderInput, ChangeOrderStatus, ChangeOrderImpactSummary } from "@/lib/models/construction";
import { changeOrderStatuses } from "@/lib/models/construction";
import { createChangeOrderAction, updateChangeOrderStatusAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function ChangeOrderManager({ projectId, orders, impact, canManage }: { projectId: string; orders: ConstructionChangeOrder[]; impact: ChangeOrderImpactSummary; canManage: boolean }) {
  return (
    <div className="mt-3">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="text-sm font-bold text-ink">Change Order Impact (from approved/implemented orders only)</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Original Contract Value" value={impact.originalContractValue != null ? formatPKR(impact.originalContractValue) : "Not set"} />
          <Metric label="Approved Cost Impact" value={formatPKR(impact.approvedCostChanges)} />
          <Metric label="Revised Contract Value" value={impact.revisedContractValue != null ? formatPKR(impact.revisedContractValue) : "Not set"} accent />
          <Metric label="Schedule Impact" value={`${impact.approvedScheduleChangeDays >= 0 ? "+" : ""}${impact.approvedScheduleChangeDays} days`} />
        </div>
        <p className="mt-2 text-xs text-muted">
          Original completion: {impact.originalCompletionDate ? new Date(impact.originalCompletionDate).toLocaleDateString("en-GB") : "Not set"} · Revised completion:{" "}
          {impact.revisedCompletionDate ? new Date(impact.revisedCompletionDate).toLocaleDateString("en-GB") : "Not set"}. The project&apos;s own budget/dates are never auto-changed — only approved change orders affect this view.
        </p>
      </div>

      <NewChangeOrderForm projectId={projectId} />

      <div className="mt-4 space-y-2">
        {orders.map((co) => (
          <ChangeOrderRow key={co.id} projectId={projectId} co={co} canManage={canManage} />
        ))}
        {orders.length === 0 && <p className="text-sm text-muted">No change orders yet.</p>}
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function NewChangeOrderForm({ projectId }: { projectId: string }) {
  const [form, setForm] = useState<Partial<ConstructionChangeOrderInput>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof ConstructionChangeOrderInput>(key: K, value: ConstructionChangeOrderInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.description?.trim()) {
      toast.show("Please describe this change order.");
      return;
    }
    startTransition(async () => {
      try {
        await createChangeOrderAction(projectId, form as ConstructionChangeOrderInput);
        toast.show("Change order created.");
        setForm({});
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this change order.");
      }
    });
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
      <h3 className="text-sm font-bold text-ink">New Change Order</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <textarea placeholder="Description" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} className={`${inputClass} min-h-16 sm:col-span-3`} />
        <input placeholder="Reason (optional)" value={form.reason ?? ""} onChange={(e) => set("reason", e.target.value)} className={`${inputClass} sm:col-span-2`} />
        <input type="number" placeholder="Cost Impact" value={form.costImpact ?? ""} onChange={(e) => set("costImpact", Number(e.target.value))} className={inputClass} />
        <input type="number" placeholder="Schedule Impact (days)" value={form.scheduleImpactDays ?? ""} onChange={(e) => set("scheduleImpactDays", Number(e.target.value))} className={inputClass} />
      </div>
      <button type="button" onClick={create} disabled={isPending} className="mt-3 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
        <Plus className="h-3.5 w-3.5" /> Create Change Order
      </button>
    </div>
  );
}

function ChangeOrderRow({ projectId, co, canManage }: { projectId: string; co: ConstructionChangeOrder; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function setStatus(status: ChangeOrderStatus) {
    const requiresManage = status === "APPROVED" || status === "REJECTED";
    if (requiresManage && !canManage) {
      toast.show("Only construction managers can approve or reject change orders.");
      return;
    }
    startTransition(async () => {
      try {
        await updateChangeOrderStatusAction(co.id, projectId, status);
        toast.show(`Change order moved to ${status}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this change order.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">{co.changeOrderNumber}</p>
          <p className="text-xs text-muted">{co.description}</p>
          <p className="mt-1 text-xs text-muted">
            Cost: {formatPKR(co.costImpact)} · Schedule: {co.scheduleImpactDays >= 0 ? "+" : ""}
            {co.scheduleImpactDays} days {co.requestedByName ? `· Requested by ${co.requestedByName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={co.status} />
          <select value={co.status} onChange={(e) => setStatus(e.target.value as ChangeOrderStatus)} disabled={isPending} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary">
            {changeOrderStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
