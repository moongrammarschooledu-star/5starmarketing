"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Trash2, CheckCircle2, XCircle } from "lucide-react";
import type { DealDocument, DealDocumentType } from "@/lib/models/deal";
import { dealDocumentTypes, DEFAULT_DEAL_DOCUMENT_CHECKLIST } from "@/lib/models/deal";
import { uploadDealDocumentAction, setDealDocumentStatusAction, removeDealDocumentAction } from "@/lib/actions/deals.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

export function DealDocumentsPanel({ dealId, documents, canManage }: { dealId: string; documents: DealDocument[]; canManage: boolean }) {
  const [documentType, setDocumentType] = useState<DealDocumentType>("Booking Form");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  const missing = DEFAULT_DEAL_DOCUMENT_CHECKLIST.filter((t) => !documents.some((d) => d.documentType === t));

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      startTransition(async () => {
        try {
          await uploadDealDocumentAction(dealId, file.name, documentType, reader.result as string);
          toast.show("Document uploaded.");
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not upload this document.");
        }
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function setStatus(id: string, status: "Approved" | "Rejected" | "Under Review") {
    startTransition(async () => {
      await setDealDocumentStatusAction(id, dealId, status);
      toast.show(`Marked ${status}.`);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeDealDocumentAction(id, dealId);
      toast.show("Document removed.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <FileText className="h-4.5 w-4.5 text-primary" /> Documents
      </h2>

      {missing.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {missing.map((t) => (
            <span key={t} className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600">
              {t}: Not Submitted
            </span>
          ))}
        </div>
      )}

      {canManage && (
        <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-dashed border-border p-3">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DealDocumentType)}
            className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs font-semibold text-ink outline-none focus:border-primary"
          >
            {dealDocumentTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input ref={fileInput} type="file" accept="application/pdf" onChange={handleFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" /> Upload PDF
          </button>
          {error && <p className="w-full text-xs font-semibold text-primary">{error}</p>}
        </div>
      )}

      <div className="mt-4 space-y-2.5">
        {documents.length === 0 && <p className="text-sm text-muted">No documents uploaded.</p>}
        {documents.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-muted p-3 text-sm">
            <div>
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-bold text-ink hover:text-primary">
                {d.name}
              </a>
              <div className="text-xs text-muted">
                {d.documentType} {d.uploadedByName ? `· ${d.uploadedByName}` : ""} · {new Date(d.createdAt).toLocaleDateString("en-GB")}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={d.status} />
              {canManage && d.status !== "Approved" && (
                <button type="button" onClick={() => setStatus(d.id, "Approved")} title="Approve" className="flex h-7 w-7 items-center justify-center rounded-full text-success hover:bg-success/10">
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              )}
              {canManage && d.status !== "Rejected" && (
                <button type="button" onClick={() => setStatus(d.id, "Rejected")} title="Reject" className="flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-primary/10">
                  <XCircle className="h-4 w-4" />
                </button>
              )}
              {canManage && (
                <button type="button" onClick={() => remove(d.id)} title="Delete" className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-muted/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
