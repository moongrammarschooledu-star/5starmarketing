"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import type { DocumentType, DocumentVisibility } from "@/lib/models/document";
import { documentVisibilities } from "@/lib/models/document";
import { uploadDocumentAction } from "@/lib/actions/documents.actions";
import { useToast } from "@/components/admin/ToastProvider";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX_BYTES = 15 * 1024 * 1024;

export function DocumentUploadForm({
  types,
  deals,
  properties,
  projects,
  defaultDealId,
  defaultCustomerId,
  defaultPropertyId,
  defaultProjectId,
}: {
  types: DocumentType[];
  deals: { id: string; dealNumber: string; customerId?: string; propertyId?: string; projectId?: string }[];
  properties: { id: string; title: string }[];
  projects: { id: string; name: string }[];
  defaultDealId?: string;
  defaultCustomerId?: string;
  defaultPropertyId?: string;
  defaultProjectId?: string;
}) {
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState(types[0]?.code ?? "OTHER");
  const [dealId, setDealId] = useState(defaultDealId ?? "");
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? "");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [visibility, setVisibility] = useState<DocumentVisibility>("ADMIN_CUSTOMER");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  function validateAndSetFile(f: File) {
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSetFile(f);
  }

  function submit() {
    setError(null);
    setSuccess(false);
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
      const selectedDeal = deals.find((d) => d.id === dealId);
      startTransition(async () => {
        try {
          await uploadDocumentAction({
            title: title.trim(),
            documentType,
            dealId: dealId || undefined,
            customerId: defaultCustomerId ?? selectedDeal?.customerId,
            propertyId: propertyId || selectedDeal?.propertyId || undefined,
            projectId: projectId || selectedDeal?.projectId || undefined,
            visibility,
            expiresAt: expiresAt || undefined,
            fileName: file.name,
            dataUri: reader.result as string,
          });
          setSuccess(true);
          setFile(null);
          setTitle("");
          toast.show("Document uploaded.");
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not upload this document.");
        }
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInput.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
      >
        <input ref={fileInput} type="file" accept={ACCEPT} className="hidden" onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])} />
        {file ? (
          <>
            <FileText className="h-8 w-8 text-primary" />
            <p className="text-sm font-bold text-ink">{file.name}</p>
            <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-bold text-ink">Drag &amp; drop a file, or click to browse</p>
            <p className="text-xs text-muted">PDF, JPG, PNG or WEBP — up to 15MB</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-semibold text-ink">Document Title *</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Document Type *</span>
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            {types.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Visibility</span>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as DocumentVisibility)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            {documentVisibilities.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {!defaultDealId && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Deal</span>
            <select value={dealId} onChange={(e) => setDealId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
              <option value="">None</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.dealNumber}
                </option>
              ))}
            </select>
          </label>
        )}
        {!defaultPropertyId && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Property</span>
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
              <option value="">None</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {!defaultProjectId && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Project</span>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Expiry Date (if applicable)</span>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> Document uploaded successfully.
        </div>
      )}

      <button type="button" onClick={submit} disabled={isPending} className="w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary-hover disabled:opacity-60">
        {isPending ? "Uploading..." : "Upload Document"}
      </button>
    </div>
  );
}
