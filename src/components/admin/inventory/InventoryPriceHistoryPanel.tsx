"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Pencil } from "lucide-react";
import type { InventoryPriceHistoryEntry } from "@/lib/models/inventory";
import { updateInventoryPriceAction } from "@/lib/actions/inventory.actions";
import { formatPKR } from "@/lib/calculator";
import { useToast } from "@/components/admin/ToastProvider";

export function InventoryPriceHistoryPanel({ inventoryId, price, history, canManage }: { inventoryId: string; price?: number; history: InventoryPriceHistoryEntry[]; canManage: boolean }) {
  const [editing, setEditing] = useState(false);
  const [newPrice, setNewPrice] = useState(price?.toString() ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function save() {
    const value = Number(newPrice);
    if (!Number.isFinite(value) || value < 0) {
      setError("Enter a valid price.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await updateInventoryPriceAction(inventoryId, value, reason || undefined);
        setEditing(false);
        setReason("");
        toast.show("Price updated.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update price.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
          <Wallet className="h-4.5 w-4.5 text-primary" /> Price
        </h2>
        {canManage && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
            <Pencil className="h-3.5 w-3.5" /> Change Price
          </button>
        )}
      </div>

      {!editing ? (
        <p className="mt-3 font-heading text-2xl font-extrabold text-ink">{price !== undefined ? formatPKR(price) : "Not set"}</p>
      ) : (
        <div className="mt-3 space-y-3">
          <input type="number" min={0} value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          {error && <p className="text-xs font-semibold text-primary">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-full border-2 border-ink/15 px-5 py-2 text-xs font-bold text-ink">
              Cancel
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-sm">
              <span className="text-muted">
                {h.previousPrice !== undefined ? formatPKR(h.previousPrice) : "—"} → <span className="font-bold text-ink">{formatPKR(h.newPrice)}</span>
                {h.reason && <span className="text-xs text-muted-foreground"> ({h.reason})</span>}
              </span>
              <span className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleDateString("en-GB")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
