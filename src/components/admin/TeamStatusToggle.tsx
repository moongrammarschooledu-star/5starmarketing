"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTeamMemberStatusAction } from "@/lib/actions/team.actions";
import { useToast } from "./ToastProvider";

export function TeamStatusToggle({ id, status }: { id: string; status: "Active" | "Inactive" }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const next = status === "Active" ? "Inactive" : "Active";
          await setTeamMemberStatusAction(id, next);
          toast.show(next === "Active" ? "Team member activated." : "Team member deactivated.");
          router.refresh();
        })
      }
      className="rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
    >
      {status === "Active" ? "Deactivate" : "Activate"}
    </button>
  );
}
