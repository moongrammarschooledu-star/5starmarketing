"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RentalNotice } from "@/lib/models/rental";
import { acknowledgeRentalNoticeAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

export function CustomerNoticeList({ notices }: { notices: RentalNotice[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function acknowledge(id: string) {
    startTransition(async () => {
      try {
        await acknowledgeRentalNoticeAction(id);
        toast.show("Notice acknowledged.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not acknowledge this notice.");
      }
    });
  }

  return (
    <div className="mt-3 space-y-2">
      {notices.map((n) => (
        <div key={n.id} className="rounded-xl border border-border bg-surface p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{n.noticeType.replace(/_/g, " ")}</p>
            <StatusBadge status={n.status} />
          </div>
          <p className="mt-1 text-xs text-muted">{n.content}</p>
          <p className="mt-1 text-[11px] text-muted">Issued {new Date(n.issueDate).toLocaleDateString("en-GB")}</p>
          {n.status === "ISSUED" && (
            <button type="button" onClick={() => acknowledge(n.id)} disabled={isPending} className="mt-2 text-xs font-bold text-primary hover:underline">
              Acknowledge
            </button>
          )}
        </div>
      ))}
      {notices.length === 0 && <p className="text-sm text-muted">No notices yet.</p>}
    </div>
  );
}
