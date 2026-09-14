"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Download } from "lucide-react";
import type { DocumentType, DocumentRecord, DocumentVisibility } from "@/lib/models/document";
import { uploadDocumentAction, getDocumentSignedUrlAction } from "@/lib/actions/documents.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX_BYTES = 15 * 1024 * 1024;

export function LeaseDocumentManager({ leaseId, documents, types }: { leaseId: string; documents: DocumentRecord[]; types: DocumentType[] }) {
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState(types[0]?.code ?? "");
  const [visibility, setVisibility] = useState<DocumentVisibility>("ADMIN_ONLY");
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
    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a document title.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      startTransition(async () => {
        try {
          await uploadDocumentAction({ title: title.trim(), documentType, leaseId, visibility, fileName: file.name, dataUri: reader.result as string });
          toast.show("Document uploaded.");
          setFile(null);
          setTitle("");
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

  return (
    <div className="mt-3">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="text-sm font-bold text-ink">Upload Document</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary sm:col-span-2" />
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
            {types.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
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
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as DocumentVisibility)} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-primary">
            <option value="ADMIN_ONLY">Admin Only</option>
            <option value="ADMIN_CUSTOMER">Visible to Tenant/Landlord</option>
          </select>
        </div>
        {error && <p className="mt-2 text-xs font-semibold text-primary">{error}</p>}
        <button type="button" onClick={upload} disabled={isPending} className="mt-3 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
          Upload
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted" />
              <div>
                <p className="text-sm font-bold text-ink">{doc.title}</p>
                <p className="text-xs text-muted">
                  {doc.documentTypeLabel ?? doc.documentType} · {new Date(doc.createdAt).toLocaleDateString("en-GB")}
                </p>
                {doc.visibility === "ADMIN_CUSTOMER" && <span className="mt-0.5 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">Visible to tenant/landlord</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={doc.status} />
              <button type="button" onClick={() => viewDocument(doc.id)} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                <Download className="h-3.5 w-3.5" /> View
              </button>
            </div>
          </div>
        ))}
        {documents.length === 0 && <p className="text-sm text-muted">No documents uploaded for this lease yet.</p>}
      </div>
    </div>
  );
}
