"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ConstructionProjectStatus } from "@/lib/models/construction";
import { updateConstructionProjectStatusAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function ConstructionProjectStatusActions({ projectId, allowed }: { projectId: string; allowed: ConstructionProjectStatus[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function move(status: ConstructionProjectStatus) {
    startTransition(async () => {
      try {
        await updateConstructionProjectStatusAction(projectId, status);
        toast.show(`Moved to ${status.replace(/_/g, " ")}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this project.");
      }
    });
  }

  if (allowed.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {allowed.map((status) => (
        <button key={status} type="button" onClick={() => move(status)} disabled={isPending} className="rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
          Move to {status.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}
