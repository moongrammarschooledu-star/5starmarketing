"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import type {
  ConstructionMaterial,
  ConstructionMaterialInput,
  ConstructionMaterialRequest,
  ConstructionMaterialRequestInput,
  MaterialCategory,
  MaterialMovementType,
  MaterialRequestPriority,
  MaterialRequestStatus,
} from "@/lib/models/construction";
import { materialCategories, materialMovementTypes, materialRequestPriorities, materialRequestStatuses } from "@/lib/models/construction";
import { createMaterialAction, recordMaterialMovementAction, createMaterialRequestAction, updateMaterialRequestStatusAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function MaterialManager({
  projectId,
  materials,
  requests,
  phases,
}: {
  projectId: string;
  materials: ConstructionMaterial[];
  requests: ConstructionMaterialRequest[];
  phases: { id: string; name: string }[];
}) {
  return (
    <div className="mt-3 space-y-8">
      <section>
        <h3 className="font-heading text-base font-bold text-ink">Material Inventory</h3>
        <AddMaterialForm projectId={projectId} />
        <div className="mt-3 space-y-2">
          {materials.map((m) => (
            <MaterialRow key={m.id} projectId={projectId} material={m} />
          ))}
          {materials.length === 0 && <p className="text-sm text-muted">No materials tracked yet.</p>}
        </div>
      </section>

      <section>
        <h3 className="font-heading text-base font-bold text-ink">Material Requests</h3>
        <AddMaterialRequestForm projectId={projectId} materials={materials} phases={phases} />
        <div className="mt-3 space-y-2">
          {requests.map((r) => (
            <RequestRow key={r.id} projectId={projectId} request={r} />
          ))}
          {requests.length === 0 && <p className="text-sm text-muted">No material requests yet.</p>}
        </div>
      </section>
    </div>
  );
}

function AddMaterialForm({ projectId }: { projectId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<ConstructionMaterialInput>>({ category: "Other" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof ConstructionMaterialInput>(key: K, value: ConstructionMaterialInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.materialCode?.trim() || !form.name?.trim() || !form.unit?.trim()) {
      toast.show("Please enter a material code, name and unit.");
      return;
    }
    startTransition(async () => {
      try {
        await createMaterialAction(projectId, form as ConstructionMaterialInput);
        toast.show("Material added.");
        setForm({ category: "Other" });
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not add this material.");
      }
    });
  }

  return (
    <div className="mt-2 rounded-2xl border border-border bg-surface p-5">
      <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-bold text-ink">Add Material</span>
        {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
      </button>
      {showForm && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input placeholder="Material Code" value={form.materialCode ?? ""} onChange={(e) => set("materialCode", e.target.value)} className={inputClass} />
            <input placeholder="Name" value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} className={`${inputClass} sm:col-span-2`} />
            <select value={form.category ?? "Other"} onChange={(e) => set("category", e.target.value as MaterialCategory)} className={inputClass}>
              {materialCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input placeholder="Unit (e.g. bags, kg)" value={form.unit ?? ""} onChange={(e) => set("unit", e.target.value)} className={inputClass} />
            <input type="number" placeholder="Required Qty" value={form.requiredQuantity ?? ""} onChange={(e) => set("requiredQuantity", Number(e.target.value))} className={inputClass} />
            <input type="number" placeholder="Reorder Threshold" value={form.reorderThreshold ?? ""} onChange={(e) => set("reorderThreshold", Number(e.target.value))} className={inputClass} />
            <input type="number" placeholder="Estimated Rate" value={form.estimatedRate ?? ""} onChange={(e) => set("estimatedRate", Number(e.target.value))} className={inputClass} />
          </div>
          <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Add Material
          </button>
        </div>
      )}
    </div>
  );
}

function MaterialRow({ projectId, material }: { projectId: string; material: ConstructionMaterial }) {
  const [showMovement, setShowMovement] = useState(false);
  const [movementType, setMovementType] = useState<MaterialMovementType>("ORDERED");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const low = material.reorderThreshold != null && material.remainingQuantity <= material.reorderThreshold;

  function record() {
    if (!quantity) return;
    startTransition(async () => {
      try {
        await recordMaterialMovementAction(material.id, projectId, movementType, Number(quantity), reference || undefined);
        toast.show("Movement recorded.");
        setQuantity("");
        setReference("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not record this movement.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">
            {material.materialCode} — {material.name} {low && <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">Low Stock</span>}
          </p>
          <p className="text-xs text-muted">
            {material.category} · Required {material.requiredQuantity} {material.unit} · Remaining {material.remainingQuantity} {material.unit}
          </p>
        </div>
        <button type="button" onClick={() => setShowMovement((v) => !v)} className="text-xs font-bold text-primary hover:underline">
          Record Movement
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted sm:grid-cols-4">
        <span>Ordered: {material.orderedQuantity}</span>
        <span>Received: {material.receivedQuantity}</span>
        <span>Used: {material.usedQuantity}</span>
        <span>Rate: {material.estimatedRate ?? "—"}</span>
      </div>
      {showMovement && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <select value={movementType} onChange={(e) => setMovementType(e.target.value as MaterialMovementType)} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary">
            {materialMovementTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantity" className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary" />
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference (optional)" className="w-40 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary" />
          <button type="button" onClick={record} disabled={isPending || !quantity} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            Save
          </button>
        </div>
      )}
    </div>
  );
}

function AddMaterialRequestForm({ projectId, materials, phases }: { projectId: string; materials: ConstructionMaterial[]; phases: { id: string; name: string }[] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<ConstructionMaterialRequestInput>>({ priority: "NORMAL" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof ConstructionMaterialRequestInput>(key: K, value: ConstructionMaterialRequestInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.quantity) {
      toast.show("Please enter a quantity.");
      return;
    }
    startTransition(async () => {
      try {
        await createMaterialRequestAction(projectId, form as ConstructionMaterialRequestInput);
        toast.show("Material request submitted.");
        setForm({ priority: "NORMAL" });
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this request.");
      }
    });
  }

  return (
    <div className="mt-2 rounded-2xl border border-border bg-surface p-5">
      <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-bold text-ink">New Material Request</span>
        {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
      </button>
      {showForm && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select value={form.phaseId ?? ""} onChange={(e) => set("phaseId", e.target.value)} className={inputClass}>
              <option value="">No phase</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select value={form.materialId ?? ""} onChange={(e) => set("materialId", e.target.value)} className={inputClass}>
              <option value="">Custom material...</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.materialCode} — {m.name}
                </option>
              ))}
            </select>
            {!form.materialId && <input placeholder="Material Name" value={form.materialName ?? ""} onChange={(e) => set("materialName", e.target.value)} className={inputClass} />}
            <input type="number" placeholder="Quantity" value={form.quantity ?? ""} onChange={(e) => set("quantity", Number(e.target.value))} className={inputClass} />
            <input type="date" value={form.requiredDate ?? ""} onChange={(e) => set("requiredDate", e.target.value)} className={inputClass} />
            <select value={form.priority ?? "NORMAL"} onChange={(e) => set("priority", e.target.value as MaterialRequestPriority)} className={inputClass}>
              {materialRequestPriorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input placeholder="Reason (optional)" value={form.reason ?? ""} onChange={(e) => set("reason", e.target.value)} className={`${inputClass} sm:col-span-3`} />
          </div>
          <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Submit Request
          </button>
        </div>
      )}
    </div>
  );
}

function RequestRow({ projectId, request }: { projectId: string; request: ConstructionMaterialRequest }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function setStatus(status: MaterialRequestStatus) {
    startTransition(async () => {
      try {
        await updateMaterialRequestStatusAction(request.id, projectId, status);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this request.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">
            {request.requestNumber} — {request.materialName ?? "Custom material"}
          </p>
          <p className="text-xs text-muted">
            {request.phaseName ? `${request.phaseName} · ` : ""}
            Qty {request.quantity} {request.requiredDate ? `· Needed by ${new Date(request.requiredDate).toLocaleDateString("en-GB")}` : ""}
          </p>
          {request.reason && <p className="mt-1 text-xs text-muted">{request.reason}</p>}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={request.priority} />
          <StatusBadge status={request.status} />
        </div>
      </div>
      <div className="mt-2">
        <select value={request.status} onChange={(e) => setStatus(e.target.value as MaterialRequestStatus)} disabled={isPending} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary">
          {materialRequestStatuses.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
