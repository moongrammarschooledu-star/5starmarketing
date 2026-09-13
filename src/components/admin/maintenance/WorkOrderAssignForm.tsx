"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignWorkOrderAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function WorkOrderAssignForm({
  workOrderId,
  vendors,
  technicians,
  currentVendorId,
  currentTechnicianId,
}: {
  workOrderId: string;
  vendors: { id: string; businessName: string }[];
  technicians: { id: string; name: string }[];
  currentVendorId?: string;
  currentTechnicianId?: string;
}) {
  const [vendorId, setVendorId] = useState(currentVendorId ?? "");
  const [technicianId, setTechnicianId] = useState(currentTechnicianId ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function save() {
    startTransition(async () => {
      try {
        await assignWorkOrderAction(workOrderId, { vendorId: vendorId || undefined, technicianId: technicianId || undefined });
        toast.show("Assignment updated.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this assignment.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-heading text-base font-bold text-ink">Assignment</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Vendor</span>
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputClass}>
            <option value="">None</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.businessName}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Internal Technician</span>
          <select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} className={inputClass}>
            <option value="">None</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="button" onClick={save} disabled={isPending} className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
        Save Assignment
      </button>
    </div>
  );
}
