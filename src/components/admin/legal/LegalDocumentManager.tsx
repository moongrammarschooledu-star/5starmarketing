"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Download } from "lucide-react";
import type { DocumentType } from "@/lib/models/document";
import type { LegalDocument, ConfidentialityLevel, CopyType } from "@/lib/models/legal";
import { confidentialityLevels, copyTypes } from "@/lib/models/legal";
import { uploadLegalDocumentAction, verifyLegalDocumentAction, rejectLegalDocumentAction, submitLegalDocumentForReviewAction, updateLegalDocumentClassificationAction } from "@/lib/actions/legal.actions";
import { getDocumentSignedUrlAction } from "@/lib/actions/documents.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX_BYTES = 15 * 1024 * 1024;
const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function LegalDocumentManager({ propertyId, documents, types, canManage }: { propertyId: string; documents: LegalDocument[]; types: DocumentType[]; canManage: boolean }) {
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState(types[0]?.code ?? "");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [confidentialityLevel, setConfidentialityLevel] = useState<ConfidentialityLevel>("INTERNAL");
  const [copyType, setCopyType] = useState<CopyType>("UNKNOWN");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  function pickFile(f: File) {
    setError(null);
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("Unsupported file type. Use PDF, JPG, PNG or WEBP.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("File is larger than 15MB.");
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function upload() {
    setError(null);
    if (!file) return setError("Please choose a file to upload.");
    if (!title.trim()) return setError("Please enter a document title.");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      startTransition(async () => {
        try {
          await uploadLegalDocumentAction({
            title: title.trim(),
            documentType,
            fileName: file.name,
            dataUri: reader.result as string,
            propertyId,
            issuingAuthority: issuingAuthority || undefined,
            referenceNumber: referenceNumber || undefined,
            expiresAt: expiresAt || undefined,
            confidentialityLevel,
            copyType,
          });
          toast.show("Legal document uploaded.");
          setFile(null);
          setTitle("");
          setIssuingAuthority("");
          setReferenceNumber("");
          setExpiresAt("");
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not upload this document.");
        }
      });
    };
    reader.readAsDataURL(file);
  }

  function viewDocument(documentId: string) {
    startTransition(async () => {
      try {
        const url = await getDocumentSignedUrlAction(documentId, "Viewed");
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not open this document.");
      }
    });
  }

  function act(fn: () => Promise<unknown>, okMessage: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.show(okMessage);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this document.");
      }
    });
  }

  return (
    <div className="mt-3">
      {canManage && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-sm font-bold text-ink">Upload Legal Document</h3>
          <p className="mt-1 text-xs text-muted">Never claim &quot;Certified Copy&quot; unless you are authorized to do so and have verified the original.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} sm:col-span-2`} />
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className={inputClass}>
              {types.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
            <input placeholder="Issuing authority (optional)" value={issuingAuthority} onChange={(e) => setIssuingAuthority(e.target.value)} className={inputClass} />
            <input placeholder="Reference number (optional)" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className={inputClass} />
            <input type="date" placeholder="Expiry date (optional)" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputClass} />
            <select value={confidentialityLevel} onChange={(e) => setConfidentialityLevel(e.target.value as ConfidentialityLevel)} className={inputClass}>
              {confidentialityLevels.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select value={copyType} onChange={(e) => setCopyType(e.target.value as CopyType)} className={inputClass}>
              {copyTypes.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input ref={fileInput} type="file" accept={ACCEPT} className="hidden" onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
            <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold text-ink hover:bg-surface-muted">
              <Upload className="h-3.5 w-3.5" /> Choose File
            </button>
            {file && <span className="text-xs text-muted">{file.name}</span>}
          </div>
          {error && <p className="mt-2 text-xs font-semibold text-primary">{error}</p>}
          <button type="button" onClick={upload} disabled={isPending} className="mt-3 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            Upload
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted" />
              <div>
                <p className="text-sm font-bold text-ink">{doc.documentTitle}</p>
                <p className="text-xs text-muted">
                  {doc.copyType.replace(/_/g, " ")} · {doc.confidentialityLevel} {doc.issuingAuthority ? `· ${doc.issuingAuthority}` : ""} {doc.documentExpiresAt ? `· Expires ${doc.documentExpiresAt}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {doc.documentStatus && <StatusBadge status={doc.documentStatus} />}
              <button type="button" onClick={() => viewDocument(doc.documentId)} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                <Download className="h-3.5 w-3.5" /> View
              </button>
              {canManage && doc.documentStatus === "UPLOADED" && (
                <button type="button" disabled={isPending} onClick={() => act(() => submitLegalDocumentForReviewAction(doc.documentId), "Submitted for review.")} className="text-xs font-bold text-ink hover:underline">
                  Submit for Review
                </button>
              )}
              {canManage && (doc.documentStatus === "UNDER_REVIEW" || doc.documentStatus === "UPLOADED") && (
                <>
                  <button type="button" disabled={isPending} onClick={() => act(() => verifyLegalDocumentAction(doc.documentId), "Marked verified.")} className="text-xs font-bold text-success hover:underline">
                    Verify
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      const reason = window.prompt("Rejection reason:");
                      if (reason) act(() => rejectLegalDocumentAction(doc.documentId, reason), "Rejected.");
                    }}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Reject
                  </button>
                </>
              )}
              {canManage && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    const notes = window.prompt("Verification notes (internal):", doc.verificationNotes ?? "");
                    if (notes !== null) act(() => updateLegalDocumentClassificationAction(doc.id, { verificationNotes: notes }), "Notes updated.");
                  }}
                  className="text-xs font-bold text-ink hover:underline"
                >
                  Notes
                </button>
              )}
            </div>
          </div>
        ))}
        {documents.length === 0 && <p className="text-sm text-muted">No legal documents uploaded for this property yet.</p>}
      </div>
    </div>
  );
}
