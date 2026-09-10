"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Archive, ArchiveRestore, RefreshCw, ShieldCheck, CalendarX } from "lucide-react";
import type { DocumentRecord } from "@/lib/models/document";
import {
  submitDocumentForReviewAction,
  verifyDocumentAction,
  approveDocumentAction,
  rejectDocumentAction,
  archiveDocumentAction,
  restoreDocumentAction,
  replaceDocumentAction,
  markDocumentExpiredAction,
} from "@/lib/actions/documents.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { Modal } from "@/components/admin/Modal";

export function DocumentStatusActionsPanel({ document, canManage }: { document: DocumentRecord; canManage: boolean }) {
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [replaceReason, setReplaceReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  function run(action: () => Promise<unknown>, msg: string) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        toast.show(msg);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "This action could not be completed.");
      }
    });
  }

  function handleReplaceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      run(() => replaceDocumentAction(document.id, { dataUri: reader.result as string, fileName: file.name, reason: replaceReason || undefined }), "New version uploaded.");
      setShowReplace(false);
      setReplaceReason("");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-heading text-sm font-bold text-ink">Document Status</h3>
        <p className="mt-1 text-xs text-muted">
          Current: <span className="font-bold text-ink">{document.status}</span>
        </p>
        {document.rejectionReason && document.status === "REJECTED" && <p className="mt-1.5 rounded-lg bg-primary/5 p-2 text-xs text-primary">{document.rejectionReason}</p>}
        {error && <p className="mt-2 text-xs font-semibold text-primary">{error}</p>}

        <div className="mt-3 grid grid-cols-1 gap-2.5">
          {document.status === "UPLOADED" && (
            <button type="button" onClick={() => run(() => submitDocumentForReviewAction(document.id), "Submitted for review.")} disabled={isPending} className="rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
              Submit for Review
            </button>
          )}
          {canManage && (document.status === "UPLOADED" || document.status === "UNDER_REVIEW") && (
            <button type="button" onClick={() => run(() => verifyDocumentAction(document.id), "Verified.")} disabled={isPending} className="flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
              <ShieldCheck className="h-4 w-4" /> Mark Verified
            </button>
          )}
          {canManage && (document.status === "UPLOADED" || document.status === "UNDER_REVIEW" || document.status === "VERIFIED") && (
            <>
              <button type="button" onClick={() => run(() => approveDocumentAction(document.id), "Approved.")} disabled={isPending} className="flex items-center justify-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" /> Approve
              </button>
              <button type="button" onClick={() => setShowReject(true)} disabled={isPending} className="flex items-center justify-center gap-2 rounded-full border-2 border-primary/30 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 disabled:opacity-50">
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </>
          )}
          {canManage && document.status === "APPROVED" && document.expiresAt && document.expiresAt < new Date().toISOString().slice(0, 10) && (
            <button type="button" onClick={() => run(() => markDocumentExpiredAction(document.id), "Marked as expired.")} disabled={isPending} className="flex items-center justify-center gap-2 rounded-full border-2 border-primary/30 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 disabled:opacity-50">
              <CalendarX className="h-4 w-4" /> Mark Expired
            </button>
          )}
          <button type="button" onClick={() => setShowReplace(true)} disabled={isPending} className="flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
            <RefreshCw className="h-4 w-4" /> Replace (New Version)
          </button>
          {document.status !== "ARCHIVED" ? (
            <button type="button" onClick={() => run(() => archiveDocumentAction(document.id), "Archived.")} disabled={isPending} className="flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
              <Archive className="h-4 w-4" /> Archive
            </button>
          ) : (
            <button type="button" onClick={() => run(() => restoreDocumentAction(document.id), "Restored.")} disabled={isPending} className="flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
              <ArchiveRestore className="h-4 w-4" /> Restore
            </button>
          )}
        </div>
      </div>

      <Modal open={showReject} onClose={() => setShowReject(false)} title="Reject Document">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Reason *</span>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="e.g. Document is unclear. Please upload a higher-quality copy." className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setShowReject(false)} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!rejectReason.trim()) return;
              setShowReject(false);
              run(() => rejectDocumentAction(document.id, rejectReason), "Rejected.");
              setRejectReason("");
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Reject
          </button>
        </div>
      </Modal>

      <Modal open={showReplace} onClose={() => setShowReplace(false)} title="Upload New Version">
        <p className="text-sm text-muted">The current version is preserved in history — this creates version {document.currentVersion + 1}.</p>
        <label className="mt-3 flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Reason (optional)</span>
          <input type="text" value={replaceReason} onChange={(e) => setReplaceReason(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <input ref={fileInput} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={handleReplaceFile} />
        <button type="button" onClick={() => fileInput.current?.click()} className="mt-4 w-full rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
          Choose File &amp; Upload
        </button>
      </Modal>
    </div>
  );
}
