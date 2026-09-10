"use client";

import { useState } from "react";
import { Eye, Download, FileText } from "lucide-react";
import type { DocumentRecord } from "@/lib/models/document";
import { getDocumentSignedUrlAction } from "@/lib/actions/documents.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function DocumentPreviewPanel({ document }: { document: DocumentRecord }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const toast = useToast();
  const isImage = document.mimeType.startsWith("image/");
  const isPdf = document.mimeType === "application/pdf";

  async function preview() {
    setIsPending(true);
    try {
      const url = await getDocumentSignedUrlAction(document.id, "Viewed");
      setPreviewUrl(url);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not load preview.");
    } finally {
      setIsPending(false);
    }
  }

  async function download() {
    setIsPending(true);
    try {
      const url = await getDocumentSignedUrlAction(document.id, "Downloaded");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not download this document.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
          <FileText className="h-4.5 w-4.5 text-primary" /> Document Preview
        </h2>
        <div className="flex gap-2">
          <button type="button" onClick={preview} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button type="button" onClick={download} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      </div>

      <div className="mt-4">
        {!previewUrl ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted text-sm text-muted">
            Click Preview to load this document via a secure, time-limited link.
          </div>
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={document.title} className="max-h-[600px] w-full rounded-xl border border-border object-contain" />
        ) : isPdf ? (
          <iframe src={previewUrl} className="h-[600px] w-full rounded-xl border border-border" title={document.title} />
        ) : (
          <p className="text-sm text-muted">Preview isn&apos;t available for this file type — use Download instead.</p>
        )}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {document.fileName} · v{document.currentVersion} · {(document.fileSize / 1024).toFixed(0)} KB
      </p>
    </div>
  );
}
