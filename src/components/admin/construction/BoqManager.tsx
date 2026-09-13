"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, FileDown } from "lucide-react";
import type { ConstructionBoq, ConstructionBoqItem, ConstructionBoqItemInput, BoqCategory, BoqStatus } from "@/lib/models/construction";
import { boqCategories, boqStatuses } from "@/lib/models/construction";
import { ensureBoqAction, updateBoqStatusAction, addBoqItemAction, setBoqApprovedRateAction, setBoqActualsAction, removeBoqItemAction, generateBoqPdfAction } from "@/lib/actions/construction.actions";
import { getDocumentSignedUrlAction } from "@/lib/actions/documents.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

const inputClass = "rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary";

export function BoqManager({ projectId, boq, items, canManage }: { projectId: string; boq?: ConstructionBoq; items: ConstructionBoqItem[]; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function ensure() {
    startTransition(async () => {
      try {
        await ensureBoqAction(projectId);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create the BOQ.");
      }
    });
  }

  if (!boq) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">No BOQ created for this project yet.</p>
        <button type="button" onClick={ensure} disabled={isPending} className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          Create BOQ
        </button>
      </div>
    );
  }

  const totalEstimated = items.reduce((s, i) => s + i.estimatedAmount, 0);
  const totalApproved = items.reduce((s, i) => s + (i.approvedAmount ?? 0), 0);
  const totalActual = items.reduce((s, i) => s + (i.actualAmount ?? 0), 0);

  function setStatus(status: BoqStatus) {
    startTransition(async () => {
      try {
        await updateBoqStatusAction(boq!.id, projectId, status);
        toast.show(`BOQ moved to ${status}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this BOQ.");
      }
    });
  }

  function generatePdf() {
    startTransition(async () => {
      try {
        const doc = await generateBoqPdfAction(projectId);
        const url = await getDocumentSignedUrlAction(doc.id, "Downloaded");
        window.open(url, "_blank", "noopener,noreferrer");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not generate this PDF.");
      }
    });
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <div>
          <p className="text-sm font-bold text-ink">{boq.boqNumber}</p>
          <p className="text-xs text-muted">
            Estimated: {formatPKR(totalEstimated)} · Approved: {formatPKR(totalApproved)} · Actual: {formatPKR(totalActual)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={generatePdf} disabled={isPending || items.length === 0} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
            <FileDown className="h-3.5 w-3.5" /> PDF
          </button>
          <StatusBadge status={boq.status} />
          {canManage && (
            <select value={boq.status} onChange={(e) => setStatus(e.target.value as BoqStatus)} disabled={isPending} className={inputClass}>
              {boqStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5">Category</th>
              <th className="px-3 py-2.5">Item</th>
              <th className="px-3 py-2.5">Unit</th>
              <th className="px-3 py-2.5">Qty</th>
              <th className="px-3 py-2.5">Est. Rate</th>
              <th className="px-3 py-2.5">Est. Amount</th>
              <th className="px-3 py-2.5">Approved Rate</th>
              <th className="px-3 py-2.5">Actual Qty/Rate</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <BoqItemRow key={item.id} projectId={projectId} item={item} canManage={canManage} />
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-muted">
                  No BOQ items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddBoqItemForm boqId={boq.id} projectId={projectId} />
    </div>
  );
}

function BoqItemRow({ projectId, item, canManage }: { projectId: string; item: ConstructionBoqItem; canManage: boolean }) {
  const [approvedRate, setApprovedRate] = useState(item.approvedRate?.toString() ?? "");
  const [actualQuantity, setActualQuantity] = useState(item.actualQuantity?.toString() ?? "");
  const [actualRate, setActualRate] = useState(item.actualRate?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function saveApprovedRate() {
    if (!approvedRate) return;
    startTransition(async () => {
      try {
        await setBoqApprovedRateAction(item.id, projectId, Number(approvedRate));
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not save approved rate.");
      }
    });
  }

  function saveActuals() {
    if (!actualQuantity || !actualRate) return;
    startTransition(async () => {
      try {
        await setBoqActualsAction(item.id, projectId, Number(actualQuantity), Number(actualRate));
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not save actuals.");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      await removeBoqItemAction(item.id, projectId);
      router.refresh();
    });
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2.5 text-muted">{item.category}</td>
      <td className="px-3 py-2.5 text-ink">{item.item}</td>
      <td className="px-3 py-2.5 text-muted">{item.unit}</td>
      <td className="px-3 py-2.5 text-muted">{item.quantity}</td>
      <td className="px-3 py-2.5 text-muted">{formatPKR(item.estimatedRate)}</td>
      <td className="px-3 py-2.5 font-semibold text-ink">{formatPKR(item.estimatedAmount)}</td>
      <td className="px-3 py-2.5">
        {canManage ? (
          <div className="flex items-center gap-1">
            <input value={approvedRate} onChange={(e) => setApprovedRate(e.target.value)} onBlur={saveApprovedRate} type="number" className={`${inputClass} w-20`} />
          </div>
        ) : (
          (item.approvedRate ?? "—")
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <input value={actualQuantity} onChange={(e) => setActualQuantity(e.target.value)} onBlur={saveActuals} type="number" placeholder="Qty" className={`${inputClass} w-16`} />
          <input value={actualRate} onChange={(e) => setActualRate(e.target.value)} onBlur={saveActuals} type="number" placeholder="Rate" className={`${inputClass} w-16`} />
        </div>
      </td>
      <td className="px-3 py-2.5">
        <button type="button" onClick={remove} disabled={isPending} className="text-muted hover:text-primary">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

function AddBoqItemForm({ boqId, projectId }: { boqId: string; projectId: string }) {
  const [category, setCategory] = useState<BoqCategory>("Civil");
  const [item, setItem] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [estimatedRate, setEstimatedRate] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function add() {
    if (!item.trim() || !unit.trim() || !quantity || !estimatedRate) {
      toast.show("Please fill in item, unit, quantity and estimated rate.");
      return;
    }
    startTransition(async () => {
      try {
        const input: ConstructionBoqItemInput = { category, item: item.trim(), unit: unit.trim(), quantity: Number(quantity), estimatedRate: Number(estimatedRate) };
        await addBoqItemAction(boqId, projectId, input);
        setItem("");
        setUnit("");
        setQuantity("");
        setEstimatedRate("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not add this item.");
      }
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-surface p-4">
      <select value={category} onChange={(e) => setCategory(e.target.value as BoqCategory)} className={inputClass}>
        {boqCategories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Item" className={`${inputClass} min-w-[160px] flex-1`} />
      <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" className={`${inputClass} w-20`} />
      <input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" placeholder="Qty" className={`${inputClass} w-24`} />
      <input value={estimatedRate} onChange={(e) => setEstimatedRate(e.target.value)} type="number" placeholder="Est. Rate" className={`${inputClass} w-24`} />
      <button type="button" onClick={add} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
        <Plus className="h-3.5 w-3.5" /> Add Item
      </button>
    </div>
  );
}
