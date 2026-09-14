"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RentalPropertyInput, FurnishedStatus, ResponsibilityParty } from "@/lib/models/rental";
import { furnishedStatuses, responsibilityParties } from "@/lib/models/rental";
import { createRentalPropertyAction, listUnitsForPropertyAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary";

export function NewRentalPropertyForm({ properties, landlords }: { properties: { id: string; title: string }[]; landlords: { id: string; name: string }[] }) {
  const [form, setForm] = useState<Partial<RentalPropertyInput>>({ furnishedStatus: "UNFURNISHED", utilitiesResponsibility: "TENANT", maintenanceResponsibility: "LANDLORD" });
  const [units, setUnits] = useState<{ id: string; unitNumber: string }[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof RentalPropertyInput>(key: K, value: RentalPropertyInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    if (!form.propertyId) {
      setUnits([]);
      return;
    }
    listUnitsForPropertyAction(form.propertyId).then(setUnits).catch(() => setUnits([]));
  }, [form.propertyId]);

  function create() {
    if (!form.propertyId) {
      toast.show("Please select a property.");
      return;
    }
    startTransition(async () => {
      try {
        const rentalProperty = await createRentalPropertyAction(form as RentalPropertyInput);
        toast.show("Rental property created.");
        router.push(`/admin/rentals/properties`);
        router.refresh();
        void rentalProperty;
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this rental property.");
      }
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink">Property *</span>
        <select value={form.propertyId ?? ""} onChange={(e) => set("propertyId", e.target.value)} className={inputClass}>
          <option value="">Select property</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      {units.length > 0 && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Unit (optional)</span>
          <select value={form.unitId ?? ""} onChange={(e) => set("unitId", e.target.value)} className={inputClass}>
            <option value="">Whole property (no specific unit)</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.unitNumber}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink">Landlord</span>
        <select value={form.landlordId ?? ""} onChange={(e) => set("landlordId", e.target.value)} className={inputClass}>
          <option value="">Unassigned</option>
          {landlords.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Monthly Rent</span>
          <input type="number" value={form.monthlyRent ?? ""} onChange={(e) => set("monthlyRent", Number(e.target.value))} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Security Deposit</span>
          <input type="number" value={form.securityDepositAmount ?? ""} onChange={(e) => set("securityDepositAmount", Number(e.target.value))} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Available Date</span>
          <input type="date" value={form.availableDate ?? ""} onChange={(e) => set("availableDate", e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Furnished Status</span>
          <select value={form.furnishedStatus ?? "UNFURNISHED"} onChange={(e) => set("furnishedStatus", e.target.value as FurnishedStatus)} className={inputClass}>
            {furnishedStatuses.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
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
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink">Notes</span>
        <textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className={`${inputClass} min-h-20`} />
      </label>
      <button type="button" onClick={create} disabled={isPending} className="w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
        {isPending ? "Creating..." : "Create Rental Property"}
      </button>
    </div>
  );
}
