"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LegalContract } from "@/lib/models/legal";
import { LEGAL_CONTRACT_ALLOWED_TRANSITIONS } from "@/lib/models/legal";
import { updateLegalContractStatusAction } from "@/lib/actions/legal.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function LegalContractStatusActions({ contract }: { contract: LegalContract }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const nextStatuses = LEGAL_CONTRACT_ALLOWED_TRANSITIONS[contract.status] ?? [];

  function setStatus(status: (typeof nextStatuses)[number]) {
    startTransition(async () => {
      try {
        await updateLegalContractStatusAction(contract.id, status);
        toast.show(`Status set to ${status}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this contract.");
      }
    });
  }

  if (nextStatuses.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {nextStatuses.map((s) => (
        <button key={s} type="button" disabled={isPending} onClick={() => setStatus(s)} className="rounded-full border border-border px-2.5 py-1 text-[11px] font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
          {s.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}
