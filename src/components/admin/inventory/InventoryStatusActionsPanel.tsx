"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Bookmark, Ban, Home, DollarSign, RotateCcw } from "lucide-react";
import type { InventoryUnit, ReleaseReason } from "@/lib/models/inventory";
import { releaseReasons } from "@/lib/models/inventory";
import {
  reserveInventoryAction,
  releaseInventoryAction,
  markInventoryBookedAction,
  markInventorySoldAction,
  markInventoryRentedAction,
  blockInventoryAction,
  unblockInventoryAction,
  setInventoryLifecycleAction,
} from "@/lib/actions/inventory.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export function InventoryStatusActionsPanel({ unit, assignableAgents, canManage }: { unit: InventoryUnit; assignableAgents: { id: string; name: string }[]; canManage: boolean }) {
  const [showReserve, setShowReserve] = useState(false);
  const [reserveAgentId, setReserveAgentId] = useState(unit.agentId ?? "");
  const [reservedUntil, setReservedUntil] = useState("");
  const [showRelease, setShowRelease] = useState(false);
  const [releaseReason, setReleaseReason] = useState<ReleaseReason>("Customer cancelled");
  const [showBlock, setShowBlock] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [confirmingSold, setConfirmingSold] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function run(action: () => Promise<unknown>, successMsg: string) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        toast.show(successMsg);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "This action could not be completed.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-heading text-sm font-bold text-ink">Inventory Status</h3>
        <p className="mt-1 text-xs text-muted">
          Current: <span className="font-bold text-ink">{unit.status}</span>
        </p>
        {error && <p className="mt-2 text-xs font-semibold text-primary">{error}</p>}

        <div className="mt-3 grid grid-cols-1 gap-2.5">
          {unit.status === "AVAILABLE" && (
            <button type="button" onClick={() => setShowReserve(true)} disabled={isPending} className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
              <Bookmark className="h-4 w-4" /> Reserve
            </button>
          )}
          {unit.status === "RESERVED" && (
            <>
              <button
                type="button"
                onClick={() => run(() => markInventoryBookedAction(unit.id), "Marked booked.")}
                disabled={isPending}
                className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> Mark Booked
              </button>
              <button
                type="button"
                onClick={() => setShowRelease(true)}
                disabled={isPending}
                className="flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" /> Release Reservation
              </button>
            </>
          )}
          {unit.status === "BOOKED" && canManage && (
            <>
              <button
                type="button"
                onClick={() => setConfirmingSold(true)}
                disabled={isPending}
                className="flex items-center justify-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                <DollarSign className="h-4 w-4" /> Mark Sold
              </button>
              <button
                type="button"
                onClick={() => run(() => markInventoryRentedAction(unit.id), "Marked rented.")}
                disabled={isPending}
                className="flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
              >
                <Home className="h-4 w-4" /> Mark Rented
              </button>
            </>
          )}
          {(unit.status === "UNDER_CONSTRUCTION" || unit.status === "COMING_SOON") && (
            <button
              type="button"
              onClick={() => run(() => setInventoryLifecycleAction(unit.id, "available"), "Set to available.")}
              disabled={isPending}
              className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Set Available
            </button>
          )}
          {unit.status === "AVAILABLE" && (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => run(() => setInventoryLifecycleAction(unit.id, "under_construction"), "Set to under construction.")}
                disabled={isPending}
                className="rounded-full border-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
              >
                Under Construction
              </button>
              <button
                type="button"
                onClick={() => run(() => setInventoryLifecycleAction(unit.id, "coming_soon"), "Set to coming soon.")}
                disabled={isPending}
                className="rounded-full border-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
              >
                Coming Soon
              </button>
            </div>
          )}
          {unit.status === "BLOCKED" ? (
            <button
              type="button"
              onClick={() => run(() => unblockInventoryAction(unit.id), "Unblocked.")}
              disabled={isPending}
              className="flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Unblock
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowBlock(true)}
              disabled={isPending}
              className="flex items-center justify-center gap-2 rounded-full border-2 border-primary/30 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 disabled:opacity-50"
            >
              <Ban className="h-4 w-4" /> Block Inventory
            </button>
          )}
        </div>
      </div>

      <Modal open={showReserve} onClose={() => setShowReserve(false)} title="Reserve Inventory">
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Assign Agent</span>
            <select value={reserveAgentId} onChange={(e) => setReserveAgentId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
              <option value="">Unassigned</option>
              {assignableAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Reserved Until (optional)</span>
            <input type="datetime-local" value={reservedUntil} onChange={(e) => setReservedUntil(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setShowReserve(false)} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setShowReserve(false);
              run(
                () => reserveInventoryAction(unit.id, { agentId: reserveAgentId || undefined, reservedUntil: reservedUntil ? new Date(reservedUntil).toISOString() : undefined }),
                "Reserved."
              );
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Confirm Reservation
          </button>
        </div>
      </Modal>

      <Modal open={showRelease} onClose={() => setShowRelease(false)} title="Release Reservation">
        <select value={releaseReason} onChange={(e) => setReleaseReason(e.target.value as ReleaseReason)} className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary">
          {releaseReasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setShowRelease(false)} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setShowRelease(false);
              run(() => releaseInventoryAction(unit.id, releaseReason), "Reservation released.");
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Release
          </button>
        </div>
      </Modal>

      <Modal open={showBlock} onClose={() => setShowBlock(false)} title="Block Inventory">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Reason</span>
          <input type="text" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="e.g. Owner requested hold" className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setShowBlock(false)} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setShowBlock(false);
              run(() => blockInventoryAction(unit.id, blockReason || "Blocked"), "Blocked.");
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Block
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmingSold}
        title="Mark Sold"
        message={`Confirm ${unit.unitNumber} is sold. This is a permanent transaction record.`}
        confirmLabel="Mark Sold"
        onConfirm={() => {
          setConfirmingSold(false);
          run(() => markInventorySoldAction(unit.id), "Marked sold.");
        }}
        onClose={() => setConfirmingSold(false)}
      />
    </div>
  );
}
