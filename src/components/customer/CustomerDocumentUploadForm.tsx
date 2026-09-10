"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import type { DocumentType } from "@/lib/models/document";
import { customerUploadDocumentAction } from "@/lib/actions/documents.actions";
import { useToast } from "@/components/admin/ToastProvider";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX_BYTES = 15 * 1024 * 1024;

export function CustomerDocumentUploadForm({ types }: { types: DocumentType[] }) {
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState(types[0]?.code ?? "OTHER");
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
      startTransition(async () => {
        try {
          await customerUploadDocumentAction({
            title: title.trim(),
            documentType,
            fileName: file.name,
            dataUri: reader.result as string,
          });
          setSuccess(true);
          setFile(null);
          setTitle("");
          toast.show("Document uploaded — our team will review it shortly.");
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
        <input ref={fileInput} type="file" accept={ACCEPT} capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])} />
        {file ? (
          <>
            <FileText className="h-8 w-8 text-primary" />
            <p className="text-sm font-bold text-ink">{file.name}</p>
            <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-bold text-ink">Tap to take a photo or choose a file</p>
            <p className="text-xs text-muted">PDF, JPG, PNG or WEBP — up to 15MB</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-semibold text-ink">Document Title *</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-semibold text-ink">Document Type *</span>
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            {types.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
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
