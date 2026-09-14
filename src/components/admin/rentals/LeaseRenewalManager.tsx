"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { LeaseRenewal, RenewalStatus } from "@/lib/models/rental";
import { LEASE_RENEWAL_ALLOWED_TRANSITIONS } from "@/lib/models/rental";
import { requestLeaseRenewalAction, updateLeaseRenewalStatusAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function LeaseRenewalManager({ leaseId, renewals, canManage }: { leaseId: string; renewals: LeaseRenewal[]; canManage: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [newRent, setNewRent] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function request() {
    if (!newRent || !newEndDate || !effectiveDate) {
      toast.show("Please fill in the new rent, new end date and effective date.");
      return;
    }
    startTransition(async () => {
      try {
        await requestLeaseRenewalAction(leaseId, { newRent: Number(newRent), newEndDate, effectiveDate, notes: notes || undefined });
        toast.show("Renewal requested.");
        setNewRent("");
        setNewEndDate("");
        setEffectiveDate("");
        setNotes("");
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not request this renewal.");
      }
    });
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold text-ink hover:bg-surface-muted">
        <Plus className="h-3.5 w-3.5" /> Request Renewal
      </button>
      {showForm && (
        <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-3">
          <input type="number" placeholder="New Monthly Rent" value={newRent} onChange={(e) => setNewRent(e.target.value)} className={inputClass} />
          <input type="date" placeholder="New End Date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} className={inputClass} />
          <input type="date" placeholder="Effective Date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={inputClass} />
          <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} min-h-14 sm:col-span-3`} />
          <button type="button" onClick={request} disabled={isPending} className="rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50 sm:col-span-3">
            Submit Request
          </button>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {renewals.map((r) => (
          <RenewalRow key={r.id} renewal={r} canManage={canManage} />
        ))}
        {renewals.length === 0 && <p className="text-sm text-muted">No renewals requested yet.</p>}
      </div>
    </div>
  );
}

function RenewalRow({ renewal, canManage }: { renewal: LeaseRenewal; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const allowed = LEASE_RENEWAL_ALLOWED_TRANSITIONS[renewal.status];

  function move(status: RenewalStatus) {
    startTransition(async () => {
      try {
        await updateLeaseRenewalStatusAction(renewal.id, status);
        toast.show(`Renewal moved to ${status}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this renewal.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">
            {formatPKR(renewal.oldRent)} → {formatPKR(renewal.newRent)} {renewal.changePercent != null ? `(${renewal.changePercent > 0 ? "+" : ""}${renewal.changePercent}%)` : ""}
          </p>
          <p className="text-xs text-muted">
            New term ends {new Date(renewal.newEndDate).toLocaleDateString("en-GB")} · Effective {new Date(renewal.effectiveDate).toLocaleDateString("en-GB")}
          </p>
        </div>
        <StatusBadge status={renewal.status} />
      </div>
      {canManage && allowed.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {allowed.map((status) => (
            <button key={status} type="button" onClick={() => move(status)} disabled={isPending} className="rounded-full border border-border px-3 py-1 text-xs font-bold text-ink hover:bg-surface-muted">
              {status}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
