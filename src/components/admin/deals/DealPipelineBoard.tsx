"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Deal, DealStatus } from "@/lib/models/deal";
import { allDealStatuses } from "@/lib/models/deal";
import { updateDealStatusAction } from "@/lib/actions/deals.actions";
import { formatPKR } from "@/lib/calculator";
import { useToast } from "@/components/admin/ToastProvider";
import { Modal } from "@/components/admin/Modal";
import { cancellationReasons } from "@/lib/models/deal";
import type { CancellationReason } from "@/lib/models/deal";

const COLUMN_TONE: Record<DealStatus, string> = {
  New: "border-primary/30 bg-primary/5",
  Negotiation: "border-primary/50 bg-primary/10",
  "Booking Pending": "border-amber-500/30 bg-amber-500/5",
  Booked: "border-success/30 bg-success/5",
  Documentation: "border-ink/15 bg-ink/5",
  "Payment In Progress": "border-burgundy/30 bg-burgundy/5",
  Completed: "border-success/30 bg-success/10",
  Cancelled: "border-muted/30 bg-muted/10",
};

export function DealPipelineBoard({ deals }: { deals: Deal[] }) {
  const [isPending, startTransition] = useTransition();
  const [cancelTarget, setCancelTarget] = useState<Deal | null>(null);
  const [cancelReason, setCancelReason] = useState<CancellationReason>("Customer Cancelled");
  const router = useRouter();
  const toast = useToast();

  const columns = useMemo(() => {
    const map = new Map<DealStatus, Deal[]>(allDealStatuses.map((s) => [s, []]));
    for (const deal of deals) map.get(deal.status)?.push(deal);
    return map;
  }, [deals]);

  function move(deal: Deal, next: DealStatus) {
    if (next === "Cancelled") {
      setCancelTarget(deal);
      return;
    }
    startTransition(async () => {
      try {
        await updateDealStatusAction(deal.id, next);
        toast.show(`Moved to ${next}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this deal.");
      }
    });
  }

  function confirmCancel() {
    if (!cancelTarget) return;
    const deal = cancelTarget;
    setCancelTarget(null);
    startTransition(async () => {
      try {
        await updateDealStatusAction(deal.id, "Cancelled", cancelReason);
        toast.show("Deal cancelled.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not cancel this deal.");
      }
    });
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-4 overflow-x-auto pb-2 sm:grid-cols-2 lg:flex lg:gap-4">
      {allDealStatuses.map((status) => {
        const items = columns.get(status) ?? [];
        return (
          <div key={status} className={`rounded-2xl border p-3 lg:w-80 lg:shrink-0 ${COLUMN_TONE[status]}`}>
            <div className="flex items-center justify-between px-1">
              <h3 className="font-heading text-sm font-bold text-ink">{status}</h3>
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-muted-foreground">{items.length}</span>
            </div>

            <div className="mt-3 space-y-2.5">
              {items.length === 0 && <p className="rounded-xl border border-dashed border-border bg-surface/60 p-4 text-center text-xs text-muted">No deals here.</p>}
              {items.map((deal) => {
                const currentIndex = allDealStatuses.indexOf(deal.status);
                const nextOptions = allDealStatuses.filter((s, i) => s === deal.status || (deal.status !== "Completed" && deal.status !== "Cancelled" && (i === currentIndex + 1 || i === currentIndex - 1 || s === "Cancelled")));
                return (
                  <div key={deal.id} className="rounded-xl border border-border bg-surface p-3 shadow-sm">
                    <Link href={`/admin/deals/${deal.id}`} className="block">
                      <div className="text-sm font-bold text-ink">{deal.dealNumber}</div>
                      <div className="mt-0.5 line-clamp-1 text-xs text-muted">{deal.customerName ?? "No customer linked"}</div>
                      <div className="mt-0.5 line-clamp-1 text-xs text-muted">{deal.propertyTitle ?? deal.projectName ?? "—"}</div>
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-primary">{formatPKR(deal.finalAmount)}</span>
                        <span className="text-muted-foreground">{deal.agentName ?? "Unassigned"}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{deal.outstandingAmount > 0 ? `${formatPKR(deal.outstandingAmount)} due` : "Settled"}</span>
                        <span>{new Date(deal.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                      </div>
                    </Link>
                    {deal.status !== "Completed" && deal.status !== "Cancelled" && (
                      <select
                        value={deal.status}
                        disabled={isPending}
                        onChange={(e) => move(deal, e.target.value as DealStatus)}
                        className="mt-2.5 w-full rounded-full border border-border bg-surface px-2 py-1 text-[11px] font-bold text-ink outline-none focus:border-primary"
                        aria-label={`Move ${deal.dealNumber} to a different status`}
                      >
                        {nextOptions.map((s) => (
                          <option key={s} value={s}>
                            Move to {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Deal">
        <p className="text-sm text-muted">Please select why {cancelTarget?.dealNumber} is being cancelled.</p>
        <select
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value as CancellationReason)}
          className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary"
        >
          {cancellationReasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setCancelTarget(null)} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink">
            Back
          </button>
          <button type="button" onClick={confirmCancel} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Cancel Deal
          </button>
        </div>
      </Modal>
    </div>
  );
}
