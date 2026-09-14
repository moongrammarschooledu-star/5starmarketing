"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LeaseInput, LateFeeType, ResponsibilityParty } from "@/lib/models/rental";
import { lateFeeTypes, responsibilityParties } from "@/lib/models/rental";
import { createLeaseAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary";

export function NewLeaseForm({
  rentalProperties,
  landlords,
  tenants,
}: {
  rentalProperties: { id: string; label: string; monthlyRent?: number; securityDepositAmount?: number; landlordId?: string }[];
  landlords: { id: string; name: string }[];
  tenants: { id: string; name: string }[];
}) {
  const [form, setForm] = useState<Partial<LeaseInput>>({ paymentDueDay: 1, gracePeriodDays: 0, lateFeeType: "NONE", utilitiesResponsibility: "TENANT", maintenanceResponsibility: "LANDLORD", noticePeriodDays: 30 });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof LeaseInput>(key: K, value: LeaseInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectRentalProperty(id: string) {
    const rp = rentalProperties.find((r) => r.id === id);
    setForm((prev) => ({
      ...prev,
      rentalPropertyId: id,
      landlordId: rp?.landlordId ?? prev.landlordId,
      monthlyRent: rp?.monthlyRent ?? prev.monthlyRent,
      securityDeposit: rp?.securityDepositAmount ?? prev.securityDeposit,
    }));
  }

  function create() {
    if (!form.rentalPropertyId || !form.landlordId || !form.tenantId || !form.startDate || !form.endDate || !form.monthlyRent) {
      toast.show("Please fill in property, landlord, tenant, dates and monthly rent.");
      return;
    }
    startTransition(async () => {
      try {
        const lease = await createLeaseAction(form as LeaseInput);
        toast.show("Lease created.");
        router.push(`/admin/rentals/leases/${lease.id}`);
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this lease.");
      }
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink">Rental Property *</span>
        <select value={form.rentalPropertyId ?? ""} onChange={(e) => selectRentalProperty(e.target.value)} className={inputClass}>
          <option value="">Select property</option>
          {rentalProperties.map((rp) => (
            <option key={rp.id} value={rp.id}>
              {rp.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Landlord *</span>
          <select value={form.landlordId ?? ""} onChange={(e) => set("landlordId", e.target.value)} className={inputClass}>
            <option value="">Select landlord</option>
            {landlords.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Tenant *</span>
          <select value={form.tenantId ?? ""} onChange={(e) => set("tenantId", e.target.value)} className={inputClass}>
            <option value="">Select tenant</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Start Date *</span>
          <input type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">End Date *</span>
          <input type="date" value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Monthly Rent *</span>
          <input type="number" value={form.monthlyRent ?? ""} onChange={(e) => set("monthlyRent", Number(e.target.value))} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Security Deposit</span>
          <input type="number" value={form.securityDeposit ?? ""} onChange={(e) => set("securityDeposit", Number(e.target.value))} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Payment Due Day</span>
          <input type="number" min={1} max={31} value={form.paymentDueDay ?? 1} onChange={(e) => set("paymentDueDay", Number(e.target.value))} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Grace Period (days)</span>
          <input type="number" value={form.gracePeriodDays ?? 0} onChange={(e) => set("gracePeriodDays", Number(e.target.value))} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Late Fee Type</span>
          <select value={form.lateFeeType ?? "NONE"} onChange={(e) => set("lateFeeType", e.target.value as LateFeeType)} className={inputClass}>
            {lateFeeTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Late Fee Value</span>
          <input type="number" value={form.lateFeeValue ?? ""} onChange={(e) => set("lateFeeValue", Number(e.target.value))} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Utilities Responsibility</span>
          <select value={form.utilitiesResponsibility ?? "TENANT"} onChange={(e) => set("utilitiesResponsibility", e.target.value as ResponsibilityParty)} className={inputClass}>
            {responsibilityParties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Maintenance Responsibility</span>
          <select value={form.maintenanceResponsibility ?? "LANDLORD"} onChange={(e) => set("maintenanceResponsibility", e.target.value as ResponsibilityParty)} className={inputClass}>
            {responsibilityParties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Notice Period (days)</span>
          <input type="number" value={form.noticePeriodDays ?? 30} onChange={(e) => set("noticePeriodDays", Number(e.target.value))} className={inputClass} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink">Renewal Terms</span>
        <textarea value={form.renewalTerms ?? ""} onChange={(e) => set("renewalTerms", e.target.value)} className={`${inputClass} min-h-16`} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink">Notes</span>
        <textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className={`${inputClass} min-h-16`} />
      </label>
      <button type="button" onClick={create} disabled={isPending} className="w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
        {isPending ? "Creating..." : "Create Lease"}
      </button>
    </div>
  );
}
