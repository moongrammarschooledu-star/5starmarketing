"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { sweepSlaBreachesAction } from "@/lib/actions/support.actions";
import { useToast } from "@/components/admin/ToastProvider";

/** No background job runner exists anywhere in this codebase (same
 *  disclosed limitation as every prior step) — this manually triggers
 *  the SLA-breach sweep instead of it firing on a real schedule. */
export function SlaSweepButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function run() {
    startTransition(async () => {
      try {
        const result = await sweepSlaBreachesAction();
        toast.show(`Checked — ${result.responseBreaches} new response breach(es), ${result.resolutionBreaches} new resolution breach(es).`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not check SLA breaches.");
      }
    });
  }

  return (
    <button type="button" onClick={run} disabled={isPending} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
      {isPending ? "Checking…" : "Check SLA Breaches Now"}
    </button>
  );
}
