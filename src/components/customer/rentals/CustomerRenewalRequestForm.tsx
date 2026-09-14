"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LeaseRenewal, LeaseStatus } from "@/lib/models/rental";
import { requestLeaseRenewalAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function CustomerRenewalRequestForm({ leaseId, status, renewals }: { leaseId: string; status: LeaseStatus; renewals: LeaseRenewal[] }) {
  const [showForm, setShowForm] = useState(false);
  const [newRent, setNewRent] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const hasOpenRequest = renewals.some((r) => !["SIGNED", "REJECTED", "CANCELLED"].includes(r.status));
  const canRequest = (status === "ACTIVE" || status === "EXPIRING") && !hasOpenRequest;

  function request() {
    if (!newRent || !newEndDate || !effectiveDate) {
      toast.show("Please fill in the requested rent, new end date and effective date.");
      return;
    }
    startTransition(async () => {
      try {
        await requestLeaseRenewalAction(leaseId, { newRent: Number(newRent), newEndDate, effectiveDate });
        toast.show("Renewal request submitted.");
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not submit this request.");
      }
    });
  }

  return (
    <div className="mt-3">
      {canRequest && (
        <button type="button" onClick={() => setShowForm((v) => !v)} className="rounded-full border border-border px-4 py-2 text-xs font-bold text-ink hover:bg-surface-muted">
          Request Renewal
        </button>
      )}
      {showForm && (
        <div className="mt-3 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-3">
          <input type="number" placeholder="Requested Rent" value={newRent} onChange={(e) => setNewRent(e.target.value)} className={inputClass} />
          <input type="date" placeholder="New End Date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} className={inputClass} />
          <input type="date" placeholder="Effective Date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={inputClass} />
          <button type="button" onClick={request} disabled={isPending} className="rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50 sm:col-span-3">
            Submit Request
          </button>
        </div>
      )}
      {renewals.length > 0 && (
        <div className="mt-3 space-y-2">
          {renewals.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-xs">
              <span className="text-ink">
                {formatPKR(r.oldRent)} → {formatPKR(r.newRent)}, new end {new Date(r.newEndDate).toLocaleDateString("en-GB")}
              </span>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
