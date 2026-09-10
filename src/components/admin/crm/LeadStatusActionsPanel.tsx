"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Archive, ArchiveRestore, GitMerge } from "lucide-react";
import type { Lead, LostReason } from "@/lib/models/lead";
import { lostReasons } from "@/lib/models/lead";
import {
  markLeadConvertedAction,
  markLeadLostAction,
  archiveLeadAction,
  unarchiveLeadAction,
  mergeLeadsAction,
} from "@/lib/actions/crm.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Modal } from "@/components/admin/Modal";

export function LeadStatusActionsPanel({ lead, duplicates }: { lead: Lead; duplicates: Lead[] }) {
  const [confirming, setConfirming] = useState<"convert" | "archive" | "unarchive" | null>(null);
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState<LostReason>("Budget");
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState(duplicates[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function convert() {
    setConfirming(null);
    startTransition(async () => {
      await markLeadConvertedAction(lead.id);
      toast.show("Lead marked as converted.");
      router.refresh();
    });
  }

  function markLost() {
    setShowLostModal(false);
    startTransition(async () => {
      await markLeadLostAction(lead.id, lostReason);
      toast.show("Lead marked as lost.");
      router.refresh();
    });
  }

  function archive() {
    setConfirming(null);
    startTransition(async () => {
      await archiveLeadAction(lead.id);
      toast.show("Lead archived.");
      router.push("/admin/crm/leads");
    });
  }

  function unarchive() {
    setConfirming(null);
    startTransition(async () => {
      await unarchiveLeadAction(lead.id);
      toast.show("Lead restored.");
      router.refresh();
    });
  }

  function merge() {
    if (!mergeTargetId) return;
    setShowMergeModal(false);
    startTransition(async () => {
      await mergeLeadsAction(lead.id, mergeTargetId);
      toast.show("Leads merged.");
      router.push(`/admin/crm/leads/${mergeTargetId}`);
    });
  }

  const isClosed = lead.status === "Closed" || lead.status === "Lost";

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-heading text-sm font-bold text-ink">Lead Outcome</h3>
      <div className="mt-3 grid grid-cols-1 gap-2.5">
        {!isClosed && (
          <>
            <button
              type="button"
              onClick={() => setConfirming("convert")}
              disabled={isPending}
              className="flex items-center justify-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Mark Converted
            </button>
            <button
              type="button"
              onClick={() => setShowLostModal(true)}
              disabled={isPending}
              className="flex items-center justify-center gap-2 rounded-full border-2 border-primary/30 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Mark Lost
            </button>
          </>
        )}

        {duplicates.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMergeModal(true)}
            disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <GitMerge className="h-4 w-4" /> Merge Duplicate
          </button>
        )}

        {lead.archived ? (
          <button
            type="button"
            onClick={() => setConfirming("unarchive")}
            disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <ArchiveRestore className="h-4 w-4" /> Restore from Archive
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming("archive")}
            disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <Archive className="h-4 w-4" /> Archive Lead
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirming === "convert"}
        title="Mark as Converted"
        message={`Confirm ${lead.name} has become a customer. This captures the conversion date and your name against this lead.`}
        confirmLabel="Mark Converted"
        onConfirm={convert}
        onClose={() => setConfirming(null)}
      />
      <ConfirmDialog
        open={confirming === "archive"}
        title="Archive Lead"
        message="Archiving removes this lead from the default CRM views. It keeps its full history and can be restored anytime."
        confirmLabel="Archive"
        onConfirm={archive}
        onClose={() => setConfirming(null)}
      />
      <ConfirmDialog
        open={confirming === "unarchive"}
        title="Restore Lead"
        message="This lead will reappear in the default CRM dashboard, list and pipeline."
        confirmLabel="Restore"
        onConfirm={unarchive}
        onClose={() => setConfirming(null)}
      />

      <Modal open={showLostModal} onClose={() => setShowLostModal(false)} title="Mark Lead as Lost">
        <p className="text-sm text-muted">Please select the reason this lead was lost.</p>
        <select
          value={lostReason}
          onChange={(e) => setLostReason(e.target.value as LostReason)}
          className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary"
        >
          {lostReasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setShowLostModal(false)} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink">
            Cancel
          </button>
          <button type="button" onClick={markLost} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Mark Lost
          </button>
        </div>
      </Modal>

      <Modal open={showMergeModal} onClose={() => setShowMergeModal(false)} title="Merge Duplicate Lead">
        <p className="text-sm text-muted">
          Merge <span className="font-bold text-ink">{lead.name}</span> into another lead sharing this phone/WhatsApp number.
          Notes, follow-ups, communication log and assignment history all move to the target; this lead is archived, never deleted.
        </p>
        <select
          value={mergeTargetId}
          onChange={(e) => setMergeTargetId(e.target.value)}
          className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary"
        >
          {duplicates.map((d) => (
            <option key={d.id} value={d.id}>
              Merge into: {d.name} ({new Date(d.createdAt).toLocaleDateString("en-GB")})
            </option>
          ))}
        </select>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setShowMergeModal(false)} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink">
            Cancel
          </button>
          <button type="button" onClick={merge} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Confirm Merge
          </button>
        </div>
      </Modal>
    </div>
  );
}
