"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Encumbrance, EncumbranceType } from "@/lib/models/legal";
import { encumbranceTypes } from "@/lib/models/legal";
import { createEncumbranceAction, setEncumbranceStatusAction, setEncumbranceVerificationAction } from "@/lib/actions/legal.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function EncumbranceManager({ propertyId, encumbrances, canManage }: { propertyId: string; encumbrances: Encumbrance[]; canManage: boolean }) {
  const [encumbranceType, setEncumbranceType] = useState<EncumbranceType>("MORTGAGE");
  const [holderName, setHolderName] = useState("");
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function add() {
    startTransition(async () => {
      try {
        await createEncumbranceAction({ propertyId, encumbranceType, holderName: holderName || undefined, amount: amount ? Number(amount) : undefined });
        toast.show("Encumbrance recorded.");
        setHolderName("");
        setAmount("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not record this encumbrance.");
      }
    });
  }

  function release(id: string) {
    startTransition(async () => {
      try {
        await setEncumbranceStatusAction(id, "RELEASED");
        toast.show("Marked released.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this encumbrance.");
      }
    });
  }

  function verify(id: string) {
    startTransition(async () => {
      try {
        await setEncumbranceVerificationAction(id, "VERIFIED");
        toast.show("Marked verified.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this encumbrance.");
      }
    });
  }

  return (
    <div className="mt-3">
      <div className={`rounded-2xl border p-4 text-sm ${encumbrances.some((e) => e.status === "ACTIVE") ? "border-amber-300 bg-amber-50 text-amber-900" : "border-border bg-surface-muted/40 text-muted"}`}>
        {encumbrances.length === 0
          ? "No encumbrances recorded — this means none is on record here, not that the property has been verified encumbrance-free."
          : `${encumbrances.filter((e) => e.status === "ACTIVE").length} active encumbrance(s) on record.`}
      </div>

      {canManage && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-4">
          <select value={encumbranceType} onChange={(e) => setEncumbranceType(e.target.value as EncumbranceType)} className={inputClass}>
            {encumbranceTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input placeholder="Holder name" value={holderName} onChange={(e) => setHolderName(e.target.value)} className={inputClass} />
          <input type="number" placeholder="Amount (optional)" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} w-32`} />
          <button type="button" onClick={add} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            Record
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {encumbrances.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-bold text-ink">
                {e.encumbranceType} {e.holderName ? `— ${e.holderName}` : ""}
              </p>
              <p className="text-xs text-muted">{e.amount != null ? `Amount: ${e.amount}` : "No amount recorded"}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={e.status} />
              <StatusBadge status={e.verificationStatus} />
              {canManage && e.status === "ACTIVE" && (
                <>
                  <button type="button" disabled={isPending} onClick={() => release(e.id)} className="text-xs font-bold text-success hover:underline">
                    Mark Released
                  </button>
                  {e.verificationStatus !== "VERIFIED" && (
                    <button type="button" disabled={isPending} onClick={() => verify(e.id)} className="text-xs font-bold text-ink hover:underline">
                      Verify
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
