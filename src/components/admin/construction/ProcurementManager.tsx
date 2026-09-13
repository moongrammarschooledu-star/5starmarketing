"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { ConstructionPurchaseOrder, ConstructionPurchaseOrderInput, ConstructionPurchaseOrderItemInput, PurchaseOrderStatus } from "@/lib/models/construction";
import { purchaseOrderStatuses } from "@/lib/models/construction";
import { createPurchaseOrderAction, updatePurchaseOrderStatusAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function ProcurementManager({
  projectId,
  orders,
  materials,
  vendors,
  canManage,
}: {
  projectId: string;
  orders: ConstructionPurchaseOrder[];
  materials: { id: string; label: string }[];
  vendors: { id: string; name: string }[];
  canManage: boolean;
}) {
  return (
    <div className="mt-3">
      {canManage && <NewPurchaseOrderForm projectId={projectId} materials={materials} vendors={vendors} />}
      <div className="mt-4 space-y-2">
        {orders.map((po) => (
          <PurchaseOrderRow key={po.id} projectId={projectId} po={po} canManage={canManage} />
        ))}
        {orders.length === 0 && <p className="text-sm text-muted">No purchase orders yet.</p>}
      </div>
    </div>
  );
}

function NewPurchaseOrderForm({ projectId, materials, vendors }: { projectId: string; materials: { id: string; label: string }[]; vendors: { id: string; name: string }[] }) {
  const [showForm, setShowForm] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [taxPercent, setTaxPercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ConstructionPurchaseOrderItemInput[]>([{ description: "", quantity: 1, rate: 0 }]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function updateItem(index: number, patch: Partial<ConstructionPurchaseOrderItemInput>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, rate: 0 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);

  function create() {
    if (!vendorId) {
      toast.show("Please select a vendor.");
      return;
    }
    if (items.some((i) => !i.description.trim() || !i.quantity || !i.rate)) {
      toast.show("Please fill in description, quantity and rate for every item.");
      return;
    }
    startTransition(async () => {
      try {
        const input: ConstructionPurchaseOrderInput = {
          vendorId,
          expectedDelivery: expectedDelivery || undefined,
          taxPercent: taxPercent ? Number(taxPercent) : undefined,
          discountAmount: discountAmount ? Number(discountAmount) : undefined,
          notes: notes || undefined,
          items,
        };
        await createPurchaseOrderAction(projectId, input);
        toast.show("Purchase order created.");
        setVendorId("");
        setExpectedDelivery("");
        setTaxPercent("");
        setDiscountAmount("");
        setNotes("");
        setItems([{ description: "", quantity: 1, rate: 0 }]);
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this purchase order.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="font-heading text-base font-bold text-ink">New Purchase Order</span>
        {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
      </button>
      {showForm && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputClass}>
              <option value="">Select vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} className={inputClass} />
            <input type="number" placeholder="Tax %" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} className={inputClass} />
            <input type="number" placeholder="Discount Amount" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} className={inputClass} />
            <input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} sm:col-span-2`} />
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">Items</span>
            {items.map((item, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <select value={item.materialId ?? ""} onChange={(e) => updateItem(index, { materialId: e.target.value || undefined })} className={`${inputClass} w-40`}>
                  <option value="">No material link</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <input placeholder="Description" value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} className={`${inputClass} min-w-[160px] flex-1`} />
                <input type="number" placeholder="Qty" value={item.quantity || ""} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} className={`${inputClass} w-20`} />
                <input type="number" placeholder="Rate" value={item.rate || ""} onChange={(e) => updateItem(index, { rate: Number(e.target.value) })} className={`${inputClass} w-24`} />
                <span className="w-24 text-xs font-semibold text-ink">{formatPKR((Number(item.quantity) || 0) * (Number(item.rate) || 0))}</span>
                <button type="button" onClick={() => removeItem(index)} disabled={items.length === 1} className="text-muted hover:text-primary disabled:opacity-30">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              <Plus className="h-3.5 w-3.5" /> Add Item
            </button>
          </div>

          <p className="text-sm font-bold text-ink">Subtotal: {formatPKR(subtotal)}</p>

          <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Create Purchase Order
          </button>
        </div>
      )}
    </div>
  );
}

function PurchaseOrderRow({ projectId, po, canManage }: { projectId: string; po: ConstructionPurchaseOrder; canManage: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function setStatus(status: PurchaseOrderStatus) {
    startTransition(async () => {
      try {
        await updatePurchaseOrderStatusAction(po.id, projectId, status);
        toast.show(`Purchase order moved to ${status}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this purchase order.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1.5 text-left">
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted" /> : <ChevronDown className="h-3.5 w-3.5 text-muted" />}
          <div>
            <p className="text-sm font-bold text-ink">
              {po.poNumber} — {po.vendorName ?? "Unknown vendor"}
            </p>
            <p className="text-xs text-muted">
              Total {formatPKR(po.totalAmount)} {po.expectedDelivery ? `· Expected ${new Date(po.expectedDelivery).toLocaleDateString("en-GB")}` : ""}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <StatusBadge status={po.status} />
          {canManage && (
            <select value={po.status} onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)} disabled={isPending} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary">
              {purchaseOrderStatuses.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted">
          <p>Subtotal: {formatPKR(po.subtotal)} · Tax: {formatPKR(po.taxAmount)} · Discount: {formatPKR(po.discountAmount)}</p>
          {po.items?.map((item) => (
            <p key={item.id}>
              {item.description} — {item.quantity} × {formatPKR(item.rate)} = {formatPKR(item.amount)}
            </p>
          ))}
          {po.notes && <p>Notes: {po.notes}</p>}
          {po.approvedByName && <p>Approved by {po.approvedByName}</p>}
        </div>
      )}
    </div>
  );
}
