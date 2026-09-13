"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { customerVerifyHandoverAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function CustomerHandoverVerification({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function verify() {
    startTransition(async () => {
      try {
        await customerVerifyHandoverAction(projectId);
        toast.show("Thank you — your verification has been recorded.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not record your verification.");
      }
    });
  }

  return (
    <div className="mt-4 rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
      <h3 className="text-sm font-bold text-ink">Please verify your handover</h3>
      <p className="mt-1 text-xs text-muted">Confirm once you have reviewed the completed project and any outstanding items.</p>
      <button type="button" onClick={verify} disabled={isPending} className="mt-3 flex items-center gap-1.5 rounded-full bg-success px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
        <CheckCircle2 className="h-3.5 w-3.5" /> Verify Handover
      </button>
    </div>
  );
}
