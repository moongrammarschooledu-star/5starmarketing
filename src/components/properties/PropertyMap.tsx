"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import Link from "next/link";
import Image from "next/image";
import { MapPin, BedDouble, Ruler } from "lucide-react";
import type { Property } from "@/lib/models/property";
import type { MapBounds } from "@/lib/models/propertySearch";
import { FALLBACK_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/map";
import { PropertyMapControls } from "./PropertyMapControls";

function pinIcon(color: string, size: number) {
  return L.divIcon({
    className: "",
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="1.5" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))"><path d="M12 0C7.6 0 4 3.6 4 8c0 5.4 6.8 14.7 7.1 15.1.2.3.6.3.8 0C12.2 22.7 20 13.4 20 8c0-4.4-3.6-8-8-8z"/><circle cx="12" cy="8" r="3" fill="#ffffff"/></svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

const DEFAULT_PIN = pinIcon("#e01e26", 34);
const SELECTED_PIN = pinIcon("#8a0e14", 44);

/** Pans/opens the popup for whichever property is externally selected
 *  (e.g. the visitor hovered a result card) — keeps map and list in
 *  sync without a reload. Needs useMap(), so it must live inside
 *  MapContainer; reads the same marker-ref map the markers below
 *  register themselves into. */
function SelectionSync({
  properties,
  selectedId,
  markerRefs,
}: {
  properties: Property[];
  selectedId?: string;
  markerRefs: Map<string, L.Marker>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const property = properties.find((p) => p.id === selectedId);
    if (property?.latitude === undefined || property?.longitude === undefined) return;
    map.panTo([property.latitude, property.longitude], { animate: true });
    markerRefs.get(selectedId)?.openPopup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);
  return null;
}

function BoundsWatcher({ onBoundsChanged }: { onBoundsChanged: (bounds: MapBounds, moved: boolean) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChanged({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() }, true);
    },
  });
  useEffect(() => {
    const b = map.getBounds();
    onBoundsChanged({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() }, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Imperative fly-to for "Use My Location" / a resolved geocode search
 *  result — separate from SelectionSync since this isn't about which
 *  property card is highlighted. */
function FlyTo({ target, zoom }: { target?: { latitude: number; longitude: number }; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.latitude, target.longitude], zoom ?? map.getZoom(), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.latitude, target?.longitude]);
  return null;
}

export function PropertyMap({
  properties,
  selectedId,
  onSelectProperty,
  center,
  zoom = DEFAULT_MAP_ZOOM,
  flyTarget,
  onBoundsChanged,
  showSearchThisArea,
  onSearchThisArea,
  onLocationFound,
}: {
  properties: Property[];
  selectedId?: string;
  onSelectProperty?: (id: string) => void;
  center?: { latitude: number; longitude: number };
  zoom?: number;
  flyTarget?: { latitude: number; longitude: number };
  onBoundsChanged?: (bounds: MapBounds) => void;
  showSearchThisArea?: boolean;
  onSearchThisArea?: () => void;
  onLocationFound?: (lat: number, lng: number) => void;
}) {
  const withCoords = properties.filter(
    (p): p is Property & { latitude: number; longitude: number } => p.latitude !== undefined && p.longitude !== undefined
  );
  const initialCenter = center ?? (withCoords[0] ? { latitude: withCoords[0].latitude, longitude: withCoords[0].longitude } : FALLBACK_MAP_CENTER);
  const [moved, setMoved] = useState(false);
  const markerRefsMap = useRef<Map<string, L.Marker>>(new Map());

  return (
    <div className="relative h-full w-full">
      {onLocationFound && <PropertyMapControls onLocationFound={onLocationFound} />}
      <MapContainer center={[initialCenter.latitude, initialCenter.longitude]} zoom={zoom} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
          {withCoords.map((p) => (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={p.id === selectedId ? SELECTED_PIN : DEFAULT_PIN}
              ref={(ref) => {
                if (ref) markerRefsMap.current.set(p.id, ref);
                else markerRefsMap.current.delete(p.id);
              }}
              eventHandlers={{ click: () => onSelectProperty?.(p.id) }}
            >
              <Popup minWidth={220}>
                <div className="w-48">
                  {p.images[0] && (
                    <div className="relative mb-2 h-24 w-full overflow-hidden rounded-lg bg-gray-100">
                      <Image src={p.images[0]} alt={p.title} fill sizes="200px" className="object-cover" unoptimized />
                    </div>
                  )}
                  <p className="text-sm font-bold text-ink">{p.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <MapPin className="h-3 w-3 shrink-0" /> {p.location}
                  </p>
                  <p className="mt-1 text-sm font-bold text-primary">{p.price}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                    <span>{p.type}</span>
                    <span className="flex items-center gap-0.5">
                      <Ruler className="h-3 w-3" /> {p.size}
                    </span>
                    {p.bedrooms !== undefined && (
                      <span className="flex items-center gap-0.5">
                        <BedDouble className="h-3 w-3" /> {p.bedrooms}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/properties/${p.slug}`}
                    className="mt-2 block rounded-full bg-primary px-3 py-1.5 text-center text-xs font-bold text-primary-foreground"
                  >
                    View Details
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
        <SelectionSync properties={withCoords} selectedId={selectedId} markerRefs={markerRefsMap.current} />
        <FlyTo target={flyTarget} zoom={15} />
        {onBoundsChanged && (
          <BoundsWatcher
            onBoundsChanged={(b, userMoved) => {
              onBoundsChanged(b);
              if (userMoved) setMoved(true);
            }}
          />
        )}
      </MapContainer>

      {showSearchThisArea && moved && (
        <button
          type="button"
          onClick={() => {
            onSearchThisArea?.();
            setMoved(false);
          }}
          className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white shadow-lg"
        >
          Search This Area
        </button>
      )}
    </div>
  );
}
