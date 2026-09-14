"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OwnershipAllocationSummary, OwnerType, VerificationStatus } from "@/lib/models/legal";
import { ownerTypes } from "@/lib/models/legal";
import { createOwnershipRecordAction, setOwnershipVerificationAction, setOwnershipStatusAction } from "@/lib/actions/legal.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function OwnershipManager({ propertyId, allocation, canManage }: { propertyId: string; allocation: OwnershipAllocationSummary; canManage: boolean }) {
  const [ownerName, setOwnerName] = useState("");
  const [ownerType, setOwnerType] = useState<OwnerType>("INDIVIDUAL");
  const [sharePercent, setSharePercent] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function add() {
    if (!ownerName.trim() || !sharePercent) {
      toast.show("Please enter an owner name and share percentage.");
      return;
    }
    startTransition(async () => {
      try {
        await createOwnershipRecordAction({ propertyId, ownerName: ownerName.trim(), ownerType, ownershipSharePercent: Number(sharePercent) });
        toast.show("Ownership record added.");
        setOwnerName("");
        setSharePercent("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not add this ownership record.");
      }
    });
  }

  function setVerification(id: string, status: VerificationStatus) {
    startTransition(async () => {
      try {
        await setOwnershipVerificationAction(id, status);
        toast.show(`Verification set to ${status}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update verification.");
      }
    });
  }

  function archive(id: string) {
    startTransition(async () => {
      try {
        await setOwnershipStatusAction(id, "ARCHIVED");
        toast.show("Record archived.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not archive this record.");
      }
    });
  }

  return (
    <div className="mt-3">
      <div className={`rounded-2xl border p-4 text-sm ${allocation.allocationComplete ? "border-success/30 bg-success/5 text-success" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
        {allocation.records.length === 0
          ? "No ownership records have been entered for this property yet."
          : allocation.allocationComplete
            ? `Ownership allocation complete — ${allocation.totalActiveSharePercent}% recorded across active owners.`
            : `Ownership allocation incomplete — only ${allocation.totalActiveSharePercent}% of 100% recorded. Never assumed to be a full/single owner.`}
      </div>

      {canManage && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-4">
          <input placeholder="Owner name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inputClass} />
          <select value={ownerType} onChange={(e) => setOwnerType(e.target.value as OwnerType)} className={inputClass}>
            {ownerTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input type="number" min={0} max={100} step="0.01" placeholder="Share %" value={sharePercent} onChange={(e) => setSharePercent(e.target.value)} className={`${inputClass} w-24`} />
          <button type="button" onClick={add} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            Add Owner
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {allocation.records.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-bold text-ink">
                {r.ownerName} <span className="text-xs font-normal text-muted">({r.ownerType})</span>
              </p>
              <p className="text-xs text-muted">
                {r.ownershipSharePercent}% · {r.ownershipType} · {r.status}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={r.verificationStatus} />
              {canManage && r.status === "ACTIVE" && (
                <>
                  {r.verificationStatus !== "VERIFIED" && (
                    <button type="button" disabled={isPending} onClick={() => setVerification(r.id, "VERIFIED")} className="text-xs font-bold text-success hover:underline">
                      Verify
                    </button>
                  )}
                  {r.verificationStatus !== "REQUIRES_REVIEW" && (
                    <button type="button" disabled={isPending} onClick={() => setVerification(r.id, "REQUIRES_REVIEW")} className="text-xs font-bold text-amber-600 hover:underline">
                      Flag for Review
                    </button>
                  )}
                  <button type="button" disabled={isPending} onClick={() => archive(r.id)} className="text-xs font-bold text-muted hover:underline">
                    Archive
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {allocation.records.length === 0 && <p className="text-sm text-muted">No owners recorded yet.</p>}
      </div>
    </div>
  );
}
