"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { MaintenanceWorkOrderItem, WorkOrderItemType } from "@/lib/models/maintenance";
import { addWorkOrderItemAction, removeWorkOrderItemAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { formatPKR } from "@/lib/calculator";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function WorkOrderItemsManager({ workOrderId, items }: { workOrderId: string; items: MaintenanceWorkOrderItem[] }) {
  const [itemType, setItemType] = useState<WorkOrderItemType>("PART");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function add() {
    if (!description.trim() || !unitCost) {
      toast.show("Please enter a description and unit cost.");
      return;
    }
    startTransition(async () => {
      try {
        await addWorkOrderItemAction(workOrderId, { itemType, description: description.trim(), quantity: Number(quantity) || 1, unitCost: Number(unitCost) });
        setDescription("");
        setUnitCost("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not add this item.");
      }
    });
  }

  function remove(itemId: string) {
    startTransition(async () => {
      await removeWorkOrderItemAction(itemId, workOrderId);
      router.refresh();
    });
  }

  return (
    <div className="mt-3">
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Description</th>
              <th className="px-4 py-2.5">Qty</th>
              <th className="px-4 py-2.5">Unit Cost</th>
              <th className="px-4 py-2.5">Total</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-muted">{i.itemType}</td>
                <td className="px-4 py-2.5 text-ink">{i.description}</td>
                <td className="px-4 py-2.5 text-muted">{i.quantity}</td>
                <td className="px-4 py-2.5 text-muted">{formatPKR(i.unitCost)}</td>
                <td className="px-4 py-2.5 font-semibold text-ink">{formatPKR(i.totalCost)}</td>
                <td className="px-4 py-2.5">
                  <button type="button" onClick={() => remove(i.id)} disabled={isPending} className="text-muted hover:text-primary">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                  No items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <select value={itemType} onChange={(e) => setItemType(e.target.value as WorkOrderItemType)} className={inputClass}>
          <option value="PART">Part</option>
          <option value="LABOR">Labor</option>
          <option value="OTHER">Other</option>
        </select>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className={`${inputClass} min-w-[180px] flex-1`} />
        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Qty" className={`${inputClass} w-20`} />
        <input type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="Unit Cost" className={`${inputClass} w-28`} />
        <button type="button" onClick={add} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
    </div>
  );
}
