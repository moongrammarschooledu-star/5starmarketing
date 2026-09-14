"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RentalProperty, RentalStatus } from "@/lib/models/rental";
import { rentalStatuses } from "@/lib/models/rental";
import { setRentalStatusAction, updateRentalPropertyAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

const inputClass = "rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary";

export function RentalPropertyManager({ rentalProperties, landlords, canManage }: { rentalProperties: RentalProperty[]; landlords: { id: string; name: string }[]; canManage: boolean }) {
  return (
    <div className="mt-6 space-y-2">
      {rentalProperties.map((rp) => (
        <RentalPropertyRow key={rp.id} rentalProperty={rp} landlords={landlords} canManage={canManage} />
      ))}
      {rentalProperties.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm text-muted">No rental properties yet.</p>
        </div>
      )}
    </div>
  );
}

function RentalPropertyRow({ rentalProperty, landlords, canManage }: { rentalProperty: RentalProperty; landlords: { id: string; name: string }[]; canManage: boolean }) {
  const [landlordId, setLandlordId] = useState(rentalProperty.landlordId ?? "");
  const [monthlyRent, setMonthlyRent] = useState(rentalProperty.monthlyRent?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function setStatus(status: RentalStatus) {
    startTransition(async () => {
      try {
        await setRentalStatusAction(rentalProperty.id, status);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this property.");
      }
    });
  }

  function saveLandlord() {
    if (landlordId === (rentalProperty.landlordId ?? "")) return;
    startTransition(async () => {
      await updateRentalPropertyAction(rentalProperty.id, { propertyId: rentalProperty.propertyId, landlordId: landlordId || undefined });
      router.refresh();
    });
  }

  function saveRent() {
    if (!monthlyRent || Number(monthlyRent) === rentalProperty.monthlyRent) return;
    startTransition(async () => {
      await updateRentalPropertyAction(rentalProperty.id, { propertyId: rentalProperty.propertyId, monthlyRent: Number(monthlyRent) });
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">
            {rentalProperty.propertyTitle ?? "Untitled"} {rentalProperty.unitNumber ? `— ${rentalProperty.unitNumber}` : ""}
          </p>
          <p className="text-xs text-muted">{rentalProperty.propertyLocation ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={rentalProperty.rentalStatus} />
          {canManage && (
            <select value={rentalProperty.rentalStatus} onChange={(e) => setStatus(e.target.value as RentalStatus)} disabled={isPending} className={inputClass}>
              {rentalStatuses.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {canManage && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            Landlord:
            <select value={landlordId} onChange={(e) => setLandlordId(e.target.value)} onBlur={saveLandlord} className={inputClass}>
              <option value="">Unassigned</option>
              {landlords.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            Monthly Rent:
            <input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} onBlur={saveRent} className={`${inputClass} w-28`} />
          </label>
          {rentalProperty.monthlyRent != null && <span className="text-xs text-muted">Current: {formatPKR(rentalProperty.monthlyRent)}</span>}
        </div>
      )}
    </div>
  );
}
