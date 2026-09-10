"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Clock } from "lucide-react";
import { addRecentSearch, getRecentSearches } from "@/lib/recentSearches";

const DEBOUNCE_MS = 400;

/** Debounced keyword search — commits to the URL (via onSearch) 400ms
 *  after the visitor stops typing, never on every keystroke (section
 *  35). Typing "Johar" fires one request, not five. Also surfaces
 *  recent searches (section 38, guest/localStorage) when the field is
 *  focused and empty. */
export function PropertySearchBar({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (focused) setRecent(getRecentSearches());
  }, [focused]);

  function commit(q: string) {
    if (timer.current) clearTimeout(timer.current);
    onSearch(q);
    if (q.trim()) addRecentSearch(q.trim());
    setFocused(false);
  }

  function handleChange(next: string) {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(next), DEBOUNCE_MS);
  }

  function handleClear() {
    setDraft("");
    if (timer.current) clearTimeout(timer.current);
    onSearch("");
  }

  const showRecent = focused && !draft && recent.length > 0;

  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
          if (e.key === "Escape") setFocused(false);
        }}
        placeholder="Search by title, location, project, or type — e.g. &quot;5 Marla House Johar Town&quot;"
        aria-label="Search properties"
        className="w-full rounded-full border border-border bg-surface py-3.5 pl-11 pr-10 text-sm text-ink outline-none transition-colors focus:border-primary"
      />
      {draft && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {showRecent && (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 rounded-xl border border-border bg-surface py-1.5 shadow-lg">
          <p className="px-4 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Recent Searches</p>
          {recent.map((q) => (
            <button
              key={q}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setDraft(q);
                commit(q);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink hover:bg-surface-muted"
            >
              <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
