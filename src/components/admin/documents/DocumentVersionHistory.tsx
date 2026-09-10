import { History } from "lucide-react";
import type { DocumentVersionEntry } from "@/lib/models/document";

export function DocumentVersionHistory({ versions }: { versions: DocumentVersionEntry[] }) {
  if (versions.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <History className="h-4.5 w-4.5 text-primary" /> Version History
      </h2>
      <div className="mt-4 space-y-2.5">
        {versions.map((v) => (
          <div key={v.id} className="rounded-lg bg-surface-muted p-3 text-sm">
            <p className="font-semibold text-ink">
              Version {v.versionNumber} — {v.fileName}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {v.uploadedByName ?? (v.uploadedByCustomer ? "Customer" : "System")} · {new Date(v.createdAt).toLocaleString("en-GB")} · {(v.fileSize / 1024).toFixed(0)} KB
              {v.reason ? ` · ${v.reason}` : ""}
            </p>
            {v.fileHash && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">SHA-256: {v.fileHash}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
