"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { ConstructionContractor, ConstructionContractorInput, ContractorStatus, ConstructionWorkOrder, ConstructionWorkOrderInput, ConstructionWorkOrderStatus } from "@/lib/models/construction";
import { contractorStatuses, constructionWorkOrderStatuses } from "@/lib/models/construction";
import {
  createContractorAction,
  setContractorStatusAction,
  setContractorPerformanceNotesAction,
  createConstructionWorkOrderAction,
  updateConstructionWorkOrderStatusAction,
  updateConstructionWorkOrderProgressAction,
} from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function ContractorManager({
  projectId,
  contractors,
  workOrders,
  phases,
  vendors,
  canManage,
}: {
  projectId: string;
  contractors: ConstructionContractor[];
  workOrders: ConstructionWorkOrder[];
  phases: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  canManage: boolean;
}) {
  return (
    <div className="mt-3 space-y-8">
      <section>
        <h3 className="font-heading text-base font-bold text-ink">Contractor Engagements</h3>
        {canManage && <AddContractorForm projectId={projectId} vendors={vendors} />}
        <div className="mt-3 space-y-2">
          {contractors.map((c) => (
            <ContractorRow key={c.id} projectId={projectId} contractor={c} canManage={canManage} />
          ))}
          {contractors.length === 0 && <p className="text-sm text-muted">No contractors engaged yet.</p>}
        </div>
      </section>

      <section>
        <h3 className="font-heading text-base font-bold text-ink">Work Orders</h3>
        <AddWorkOrderForm projectId={projectId} contractors={contractors} phases={phases} />
        <div className="mt-3 space-y-2">
          {workOrders.map((wo) => (
            <WorkOrderRow key={wo.id} projectId={projectId} workOrder={wo} />
          ))}
          {workOrders.length === 0 && <p className="text-sm text-muted">No work orders yet.</p>}
        </div>
      </section>
    </div>
  );
}

function AddContractorForm({ projectId, vendors }: { projectId: string; vendors: { id: string; name: string }[] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<ConstructionContractorInput>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof ConstructionContractorInput>(key: K, value: ConstructionContractorInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.vendorId) {
      toast.show("Please select a vendor.");
      return;
    }
    startTransition(async () => {
      try {
        await createContractorAction(projectId, form as ConstructionContractorInput);
        toast.show("Contractor engaged.");
        setForm({});
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not engage this contractor.");
      }
    });
  }

  return (
    <div className="mt-2 rounded-2xl border border-border bg-surface p-5">
      <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-bold text-ink">Engage Contractor</span>
        {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
      </button>
      {showForm && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select value={form.vendorId ?? ""} onChange={(e) => set("vendorId", e.target.value)} className={inputClass}>
              <option value="">Select vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <input placeholder="Service Category" value={form.serviceCategory ?? ""} onChange={(e) => set("serviceCategory", e.target.value)} className={inputClass} />
            <input type="number" placeholder="Contract Value" value={form.contractValue ?? ""} onChange={(e) => set("contractValue", Number(e.target.value))} className={inputClass} />
            <input type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} className={inputClass} />
            <input type="date" value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} className={inputClass} />
            <input placeholder="Notes (optional)" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className={inputClass} />
          </div>
          <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Engage Contractor
          </button>
        </div>
      )}
    </div>
  );
}

function ContractorRow({ projectId, contractor, canManage }: { projectId: string; contractor: ConstructionContractor; canManage: boolean }) {
  const [notes, setNotes] = useState(contractor.performanceNotes ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function setStatus(status: ContractorStatus) {
    startTransition(async () => {
      try {
        await setContractorStatusAction(contractor.id, projectId, status);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this contractor.");
      }
    });
  }

  function saveNotes() {
    if (notes === (contractor.performanceNotes ?? "")) return;
    startTransition(async () => {
      await setContractorPerformanceNotesAction(contractor.id, projectId, notes);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">{contractor.vendorName ?? "Unknown vendor"}</p>
          <p className="text-xs text-muted">
            {contractor.serviceCategory ?? "General"} {contractor.contractValue != null ? `· ${formatPKR(contractor.contractValue)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={contractor.status} />
          {canManage && (
            <select value={contractor.status} onChange={(e) => setStatus(e.target.value as ContractorStatus)} disabled={isPending} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary">
              {contractorStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {canManage && (
        <label className="mt-2 block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Performance Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} className="min-h-14 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary" />
        </label>
      )}
    </div>
  );
}

function AddWorkOrderForm({ projectId, contractors, phases }: { projectId: string; contractors: ConstructionContractor[]; phases: { id: string; name: string }[] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<ConstructionWorkOrderInput>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof ConstructionWorkOrderInput>(key: K, value: ConstructionWorkOrderInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.contractorId || !form.scope?.trim()) {
      toast.show("Please select a contractor and describe the scope.");
      return;
    }
    startTransition(async () => {
      try {
        await createConstructionWorkOrderAction(projectId, form as ConstructionWorkOrderInput);
        toast.show("Work order created.");
        setForm({});
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this work order.");
      }
    });
  }

  return (
    <div className="mt-2 rounded-2xl border border-border bg-surface p-5">
      <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-bold text-ink">Add Work Order</span>
        {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
      </button>
      {showForm && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select value={form.contractorId ?? ""} onChange={(e) => set("contractorId", e.target.value)} className={inputClass}>
              <option value="">Select contractor</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.vendorName}
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
            <input type="number" placeholder="Contract Amount" value={form.contractAmount ?? ""} onChange={(e) => set("contractAmount", Number(e.target.value))} className={inputClass} />
            <input type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} className={inputClass} />
            <input type="date" value={form.dueDate ?? ""} onChange={(e) => set("dueDate", e.target.value)} className={inputClass} />
            <input placeholder="Scope of work" value={form.scope ?? ""} onChange={(e) => set("scope", e.target.value)} className={`${inputClass} sm:col-span-3`} />
          </div>
          <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Add Work Order
          </button>
        </div>
      )}
    </div>
  );
}

function WorkOrderRow({ projectId, workOrder }: { projectId: string; workOrder: ConstructionWorkOrder }) {
  const [progress, setProgress] = useState(workOrder.progress);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function setStatus(status: ConstructionWorkOrderStatus) {
    startTransition(async () => {
      try {
        await updateConstructionWorkOrderStatusAction(workOrder.id, projectId, status);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this work order.");
      }
    });
  }

  function saveProgress() {
    startTransition(async () => {
      await updateConstructionWorkOrderProgressAction(workOrder.id, projectId, progress);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">
            {workOrder.workOrderNumber} — {workOrder.contractorName ?? "Unknown"}
          </p>
          <p className="text-xs text-muted">
            {workOrder.scope} {workOrder.phaseName ? `· ${workOrder.phaseName}` : ""} {workOrder.dueDate ? `· Due ${new Date(workOrder.dueDate).toLocaleDateString("en-GB")}` : ""}
          </p>
        </div>
        <StatusBadge status={workOrder.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} onMouseUp={saveProgress} onTouchEnd={saveProgress} className="w-28" />
          <span className="text-xs font-bold text-ink">{progress}%</span>
        </div>
        <select value={workOrder.status} onChange={(e) => setStatus(e.target.value as ConstructionWorkOrderStatus)} disabled={isPending} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary">
          {constructionWorkOrderStatuses.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
