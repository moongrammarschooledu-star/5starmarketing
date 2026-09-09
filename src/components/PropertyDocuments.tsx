import { FileText, Download } from "lucide-react";
import type { PropertyDocument } from "@/lib/models/property";

export function PropertyDocuments({ documents, title = "Documents" }: { documents: PropertyDocument[]; title?: string }) {
  if (documents.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-heading text-base font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-2">
        {documents.map((d) => (
          <a
            key={d.url}
            href={d.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 transition-colors hover:border-primary/40"
          >
            <span className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-ink">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{d.name}</span>
            </span>
            <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
          </a>
        ))}
      </div>
    </div>
  );
}
