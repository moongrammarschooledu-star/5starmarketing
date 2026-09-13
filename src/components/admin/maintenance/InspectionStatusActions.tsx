"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InspectionStatus } from "@/lib/models/maintenance";
import { updateInspectionStatusAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function InspectionStatusActions({ inspectionId, allowed }: { inspectionId: string; allowed: InspectionStatus[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function move(status: InspectionStatus) {
    startTransition(async () => {
      try {
        await updateInspectionStatusAction(inspectionId, status);
        toast.show(`Moved to ${status.replace(/_/g, " ")}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this inspection.");
      }
    });
  }

  return (
    <>
      {allowed.map((status) => (
        <button key={status} type="button" onClick={() => move(status)} disabled={isPending} className="rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
          Move to {status.replace(/_/g, " ")}
        </button>
      ))}
    </>
  );
}
