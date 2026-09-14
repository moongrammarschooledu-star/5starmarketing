"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { Landlord, LandlordInput, LandlordStatus, ManagementFeeType } from "@/lib/models/rental";
import { landlordStatuses, managementFeeTypes } from "@/lib/models/rental";
import { createLandlordAction, setLandlordStatusAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function LandlordManager({ landlords, canManage }: { landlords: Landlord[]; canManage: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<LandlordInput>>({ managementFeeType: "NONE" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof LandlordInput>(key: K, value: LandlordInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.name?.trim()) {
      toast.show("Please enter a landlord name.");
      return;
    }
    startTransition(async () => {
      try {
        await createLandlordAction(form as LandlordInput);
        toast.show("Landlord created.");
        setForm({ managementFeeType: "NONE" });
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this landlord.");
      }
    });
  }

  function setStatus(id: string, status: LandlordStatus) {
    startTransition(async () => {
      try {
        await setLandlordStatusAction(id, status);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this landlord.");
      }
    });
  }

  return (
    <div className="mt-6">
      {canManage && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
            <span className="font-heading text-base font-bold text-ink">Add Landlord</span>
            {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
          </button>
          {showForm && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input placeholder="Full Name" value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} className={inputClass} />
                <input placeholder="Phone" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
                <input placeholder="Email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} className={inputClass} />
                <input placeholder="Address" value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} className={inputClass} />
                <input placeholder="Payment Reference (e.g. Bank — Title)" value={form.paymentReference ?? ""} onChange={(e) => set("paymentReference", e.target.value)} className={`${inputClass} sm:col-span-2`} />
                <select value={form.managementFeeType ?? "NONE"} onChange={(e) => set("managementFeeType", e.target.value as ManagementFeeType)} className={inputClass}>
                  {managementFeeTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input type="number" placeholder="Management Fee Value" value={form.managementFeeValue ?? ""} onChange={(e) => set("managementFeeValue", Number(e.target.value))} className={inputClass} />
              </div>
              <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" /> Add Landlord
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {landlords.map((l) => (
          <div key={l.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-ink">{l.name}</p>
                <p className="text-xs text-muted">
                  {l.phone ?? "—"} {l.managementFeeType !== "NONE" ? `· Fee: ${l.managementFeeValue}${l.managementFeeType === "PERCENTAGE" ? "%" : ""}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/rentals/landlords/${l.id}`} className="text-xs font-bold text-primary hover:underline">
                  Statements
                </Link>
                <StatusBadge status={l.status} />
                {canManage && (
                  <select value={l.status} onChange={(e) => setStatus(l.id, e.target.value as LandlordStatus)} disabled={isPending} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary">
                    {landlordStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        ))}
        {landlords.length === 0 && <p className="text-sm text-muted">No landlords yet.</p>}
      </div>
    </div>
  );
}
