"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, ArrowRight, UserPlus } from "lucide-react";
import type { Deal, DealStatus, CancellationReason } from "@/lib/models/deal";
import { allDealStatuses, dealStatuses, cancellationReasons } from "@/lib/models/deal";
import { updateDealStatusAction, assignDealAgentAction } from "@/lib/actions/deals.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export function DealStatusActionsPanel({
  deal,
  assignableAgents,
  canAssign,
}: {
  deal: Deal;
  assignableAgents: { id: string; name: string }[];
  canAssign: boolean;
}) {
  const [agentId, setAgentId] = useState(deal.agentId ?? "");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState<CancellationReason>("Customer Cancelled");
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const isTerminal = deal.status === "Completed" || deal.status === "Cancelled";
  const currentIndex = dealStatuses.indexOf(deal.status);
  const nextStatus = !isTerminal ? dealStatuses[currentIndex + 1] : undefined;
  const prevStatus = !isTerminal && currentIndex > 0 ? dealStatuses[currentIndex - 1] : undefined;

  function move(status: DealStatus) {
    setError(null);
    startTransition(async () => {
      try {
        await updateDealStatusAction(deal.id, status);
        toast.show(`Moved to ${status}.`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update this deal's status.");
      }
    });
  }

  function complete() {
    setConfirmingComplete(false);
    startTransition(async () => {
      try {
        await updateDealStatusAction(deal.id, "Completed");
        toast.show("Deal marked as completed.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not complete this deal.");
      }
    });
  }

  function cancel() {
    setShowCancelModal(false);
    startTransition(async () => {
      try {
        await updateDealStatusAction(deal.id, "Cancelled", cancelReason);
        toast.show("Deal cancelled.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not cancel this deal.");
      }
    });
  }

  function saveAgent() {
    const agent = assignableAgents.find((a) => a.id === agentId);
    startTransition(async () => {
      await assignDealAgentAction(deal.id, agent?.id ?? null, agent?.name ?? null);
      toast.show(agent ? `Assigned to ${agent.name}.` : "Deal unassigned.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-heading text-sm font-bold text-ink">Deal Status</h3>
        <p className="mt-1 text-xs text-muted">
          Current: <span className="font-bold text-ink">{deal.status}</span>
        </p>

        {error && <p className="mt-2 text-xs font-semibold text-primary">{error}</p>}

        {!isTerminal && (
          <div className="mt-3 space-y-2">
            {nextStatus && (
              <button
                type="button"
                onClick={() => move(nextStatus)}
                disabled={isPending}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                Move to {nextStatus} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            {prevStatus && (
              <button
                type="button"
                onClick={() => move(prevStatus)}
                disabled={isPending}
                className="flex w-full items-center justify-center rounded-full border-2 border-ink/15 px-4 py-2.5 text-xs font-bold text-ink disabled:opacity-50"
              >
                Move back to {prevStatus}
              </button>
            )}
            <select
              value={deal.status}
              disabled={isPending}
              onChange={(e) => move(e.target.value as DealStatus)}
              className="w-full rounded-full border border-border bg-surface px-3 py-2 text-xs font-bold text-ink outline-none focus:border-primary"
            >
              {allDealStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {!isTerminal && (
          <div className="mt-3 grid grid-cols-1 gap-2.5">
            <button
              type="button"
              onClick={() => setConfirmingComplete(true)}
              disabled={isPending}
              className="flex items-center justify-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Mark Completed
            </button>
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              disabled={isPending}
              className="flex items-center justify-center gap-2 rounded-full border-2 border-primary/30 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Cancel Deal
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
          <UserPlus className="h-4.5 w-4.5 text-primary" /> Assigned Agent
        </h3>
        {canAssign ? (
          <>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              disabled={isPending}
              className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-primary"
            >
              <option value="">Unassigned</option>
              {assignableAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={saveAgent}
              disabled={isPending}
              className="mt-2.5 w-full rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
            >
              Save Assignment
            </button>
          </>
        ) : (
          <p className="mt-3 text-sm font-semibold text-ink">{deal.agentName || "Unassigned"}</p>
        )}
      </div>

      <ConfirmDialog
        open={confirmingComplete}
        title="Mark Deal Completed"
        message={`Confirm ${deal.dealNumber} is complete. ${deal.outstandingAmount > 0 ? `Note: PKR ${deal.outstandingAmount.toLocaleString("en-PK")} is still outstanding.` : "The deal is fully settled."}`}
        confirmLabel="Mark Completed"
        onConfirm={complete}
        onClose={() => setConfirmingComplete(false)}
      />

      <Modal open={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel Deal">
        <p className="text-sm text-muted">Please select why this deal is being cancelled.</p>
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
          <button type="button" onClick={() => setShowCancelModal(false)} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink">
            Back
          </button>
          <button type="button" onClick={cancel} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Cancel Deal
          </button>
        </div>
      </Modal>
    </div>
  );
}
