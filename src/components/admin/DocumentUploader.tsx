"use client";

import { useState } from "react";
import { Upload, FileText, X } from "lucide-react";

interface DocEntry {
  name: string;
  url: string;
}

// Lets an admin attach optional PDFs (brochure, floor plan, payment
// plan) to a property or project. Each entry is submitted as a single
// JSON-stringified hidden input; the server action parses and, for
// data: URIs, uploads them to the `documents` Storage bucket (see
// src/services/storage.ts). Nothing here is shown publicly unless an
// admin actually adds it.
export function DocumentUploader({
  name,
  initialDocuments = [],
}: {
  name: string;
  initialDocuments?: DocEntry[];
}) {
  const [docs, setDocs] = useState<DocEntry[]>(initialDocuments);
  const [label, setLabel] = useState("");

  function handleFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    const finalLabel = label.trim() || file.name.replace(/\.pdf$/i, "");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDocs((d) => [...d, { name: finalLabel, url: reader.result as string }]);
        setLabel("");
      }
    };
    reader.readAsDataURL(file);
  }

  function removeAt(index: number) {
    setDocs((d) => d.filter((_, i) => i !== index));
  }

  return (
    <div>
      {docs.map((d, i) => (
        <input key={i} type="hidden" name={name} value={JSON.stringify(d)} />
      ))}

      {docs.length > 0 && (
        <div className="mb-3 space-y-2">
          {docs.map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted/50 px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{d.name}</span>
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"
                aria-label="Remove document"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Document label (e.g. Floor Plan)"
          className="flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary">
          <Upload className="h-4 w-4" /> Upload PDF
          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files)} />
        </label>
      </div>
    </div>
  );
}
