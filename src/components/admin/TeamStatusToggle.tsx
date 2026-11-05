"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTeamMemberStatusAction } from "@/lib/actions/team.actions";
import { useToast } from "./ToastProvider";

export function TeamStatusToggle({ id, status, canManage = true }: { id: string; status: "Active" | "Inactive"; canManage?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  // a Super Admin's or another Admin's account can only be changed by a Super Admin
  if (!canManage) return <span className="text-xs text-muted-foreground">Super Admin only</span>;

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const next = status === "Active" ? "Inactive" : "Active";
          const res = await setTeamMemberStatusAction(id, next);
          if (!res.ok) {
            toast.show(res.error ?? "Could not update this team member.");
            return;
          }
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
