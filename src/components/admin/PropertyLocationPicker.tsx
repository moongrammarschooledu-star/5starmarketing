"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, X } from "lucide-react";
import { FALLBACK_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/map";

const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="34" height="34" viewBox="0 0 24 24" fill="#e01e26" stroke="#ffffff" stroke-width="1.5" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))"><path d="M12 0C7.6 0 4 3.6 4 8c0 5.4 6.8 14.7 7.1 15.1.2.3.6.3.8 0C12.2 22.7 20 13.4 20 8c0-4.4-3.6-8-8-8z"/><circle cx="12" cy="8" r="3" fill="#ffffff"/></svg>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
}

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

function FlyTo({ target }: { target?: { latitude: number; longitude: number } }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.latitude, target.longitude], 15, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.latitude, target?.longitude]);
  return null;
}

/** Admin/agent "Set Location on Map" control (STEP 16, section 43) —
 *  search a location or click/drag directly, writes into two hidden
 *  inputs (`latitude`/`longitude`) so it plugs into the existing
 *  uncontrolled PropertyForm without that form needing to change how it
 *  submits. Coordinates are only ever what an authorized admin sets
 *  here or via a real geocode result — never invented. */
export function PropertyLocationPicker({
  initialLatitude,
  initialLongitude,
}: {
  initialLatitude?: number;
  initialLongitude?: number;
}) {
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | undefined>(
    initialLatitude !== undefined && initialLongitude !== undefined ? { latitude: initialLatitude, longitude: initialLongitude } : undefined
  );
  const [flyTarget, setFlyTarget] = useState<{ latitude: number; longitude: number } | undefined>(position);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Search failed.");
      setResults(json.results);
      if (json.results.length === 0) setError("No matching location found. Try a different search.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not search for this location.");
    } finally {
      setSearching(false);
    }
  }

  function selectResult(r: GeocodeResult) {
    setPosition({ latitude: r.latitude, longitude: r.longitude });
    setFlyTarget({ latitude: r.latitude, longitude: r.longitude });
    setResults([]);
    setQuery(r.label);
  }

  const center = position ?? FALLBACK_MAP_CENTER;

  return (
    <div>
      <input type="hidden" name="latitude" value={position?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={position?.longitude ?? ""} />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            placeholder="Search a location, e.g. Johar Town, Lahore"
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="rounded-lg border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {searching ? "Searching..." : "Search"}
        </button>
        {position && (
          <button
            type="button"
            onClick={() => setPosition(undefined)}
            className="flex items-center gap-1 rounded-lg border-2 border-primary/30 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs font-semibold text-primary">{error}</p>}

      {results.length > 0 && (
        <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-surface">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectResult(r)}
              className="flex w-full items-start gap-2 border-b border-border px-3 py-2 text-left text-xs last:border-0 hover:bg-surface-muted"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {r.label}
            </button>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-muted">Or click directly on the map to place/move the marker.</p>

      <div className="mt-2 h-72 w-full overflow-hidden rounded-xl border border-border">
        <MapContainer center={[center.latitude, center.longitude]} zoom={position ? 15 : DEFAULT_MAP_ZOOM} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <ClickToPlace onPick={(lat, lng) => setPosition({ latitude: lat, longitude: lng })} />
          <FlyTo target={flyTarget} />
          {position && (
            <Marker
              position={[position.latitude, position.longitude]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target as L.Marker;
                  const { lat, lng } = marker.getLatLng();
                  setPosition({ latitude: lat, longitude: lng });
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {position && (
        <p className="mt-2 text-xs text-muted">
          {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
        </p>
      )}
    </div>
  );
}
