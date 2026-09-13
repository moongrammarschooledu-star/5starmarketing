"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { AssetWarrantyInput } from "@/lib/models/maintenance";
import { addAssetWarrantyAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function AddWarrantyForm({ assetId }: { assetId: string }) {
  const [form, setForm] = useState<Partial<AssetWarrantyInput>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof AssetWarrantyInput>(key: K, value: AssetWarrantyInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    if (!form.expiryDate) {
      toast.show("Please enter an expiry date.");
      return;
    }
    startTransition(async () => {
      try {
        await addAssetWarrantyAction(assetId, form as AssetWarrantyInput);
        toast.show("Warranty added.");
        setForm({});
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not add this warranty.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Add Warranty</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input value={form.provider ?? ""} onChange={(e) => set("provider", e.target.value)} placeholder="Provider" className={inputClass} />
        <input type="date" value={form.expiryDate ?? ""} onChange={(e) => set("expiryDate", e.target.value)} className={inputClass} />
        <input value={form.contactName ?? ""} onChange={(e) => set("contactName", e.target.value)} placeholder="Contact name" className={inputClass} />
        <input value={form.contactPhone ?? ""} onChange={(e) => set("contactPhone", e.target.value)} placeholder="Contact phone" className={inputClass} />
      </div>
      <textarea value={form.coverageDescription ?? ""} onChange={(e) => set("coverageDescription", e.target.value)} placeholder="Coverage description" className={`${inputClass} mt-3 min-h-14`} />
      <button type="button" onClick={submit} disabled={isPending} className="mt-3 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
        <Plus className="h-3.5 w-3.5" /> Add Warranty
      </button>
    </div>
  );
}
