"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

/** A search box that filters the rows of a table on the page as you type. Each row to be searched
 *  carries a `data-search` attribute with its searchable text. Rows without it (the "nothing here"
 *  row) are left alone. */
export function TableSearch({ tableId, placeholder, noun = "rows" }: { tableId: string; placeholder: string; noun?: string }) {
  const [query, setQuery] = useState("");
  const [counts, setCounts] = useState<{ shown: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const table = document.getElementById(tableId);
    if (!table) return;
    const q = query.trim().toLowerCase();
    const rows = Array.from(table.querySelectorAll<HTMLElement>("tbody tr[data-search]"));
    let shown = 0;
    for (const row of rows) {
      const hit = !q || (row.dataset.search ?? "").includes(q);
      row.style.display = hit ? "" : "none";
      if (hit) shown += 1;
    }
    setCounts(q ? { shown, total: rows.length } : null);
  }, [query, tableId]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Search"
          className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-9 text-sm text-ink outline-none focus:border-primary"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {counts && (
        <p className="text-sm font-medium text-muted">
          {counts.shown === 0 ? `No ${noun} match "${query.trim()}"` : `Showing ${counts.shown} of ${counts.total} ${noun}`}
        </p>
      )}
    </div>
  );
}
