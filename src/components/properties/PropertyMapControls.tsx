"use client";

import { useState } from "react";
import { Search, Locate, X } from "lucide-react";

interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
}

/** Floating map control (section 27/28) — search a place name (proxied
 *  through /api/geocode → Nominatim, never a client-side API key) or
 *  use the browser's own geolocation. Neither ever invents a
 *  coordinate; a denied/unsupported location shows a clear message
 *  instead of silently failing. */
export function PropertyMapControls({ onLocationFound }: { onLocationFound: (lat: number, lng: number) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setMessage(null);
    setResults([]);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Search failed.");
      if (json.results.length === 0) {
        setMessage("No matching location found.");
      } else {
        setResults(json.results);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not search for this location.");
    } finally {
      setSearching(false);
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setMessage("Location access is not supported on this device. You can search by area instead.");
      return;
    }
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationFound(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setMessage("Location access was not allowed. You can search by area instead.");
      },
      { timeout: 8000 }
    );
  }

  return (
    <div className="absolute left-3 top-3 z-[1000] w-64 max-w-[70vw]">
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Search a location..."
            className="w-full rounded-lg border border-border bg-surface py-2 pl-8 pr-2 text-xs text-ink shadow-md outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          onClick={handleUseMyLocation}
          aria-label="Use my location"
          title="Use my location"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-ink shadow-md hover:text-primary"
        >
          <Locate className="h-4 w-4" />
        </button>
      </div>

      {message && (
        <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-surface px-3 py-2 text-[11px] text-muted shadow-md">
          <span className="flex-1">{message}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-border bg-surface shadow-md">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onLocationFound(r.latitude, r.longitude);
                setResults([]);
                setQuery(r.label);
              }}
              className="block w-full border-b border-border px-3 py-1.5 text-left text-[11px] text-ink last:border-0 hover:bg-surface-muted"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
      {searching && <p className="mt-1 text-[11px] text-muted">Searching...</p>}
    </div>
  );
}
