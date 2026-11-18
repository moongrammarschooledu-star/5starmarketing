"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { searchDocumentTargetsAction } from "@/lib/actions/documents.actions";
import type { DocumentTarget, DocumentTargetKind } from "@/lib/models/document";

/** Type a name or number, pick the record. Used to attach a document to a
 *  customer contact, a lead, a lease or a customer account. */
export function RecordPicker({
  kind,
  label,
  value,
  onChange,
  placeholder,
}: {
  kind: DocumentTargetKind;
  label: string;
  value: DocumentTarget | null;
  onChange: (value: DocumentTarget | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<DocumentTarget[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const found = await searchDocumentTargetsAction(kind, query);
        if (!cancelled) setResults(found);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [kind, query, open]);

  return (
    <div className="relative flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">{label}</span>
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2.5">
          <span className="min-w-0 truncate text-sm font-semibold text-ink">
            {value.label}
            {value.sub ? <span className="ml-2 font-normal text-muted">{value.sub}</span> : null}
          </span>
          <button type="button" onClick={() => onChange(null)} aria-label={`Remove ${label}`} className="shrink-0 rounded-full p-1 text-muted hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder ?? "Type a name or number..."}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          {open && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
              {loading && results.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted">Searching...</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted">Nothing found.</p>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(r);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-muted"
                  >
                    <span className="truncate font-semibold text-ink">{r.label}</span>
                    {r.sub && <span className="shrink-0 text-xs text-muted">{r.sub}</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
