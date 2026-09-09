import { MapPin, Navigation } from "lucide-react";

export function PropertyLocationSection({
  title = "Property Location",
  location,
  mapsQuery,
}: {
  title?: string;
  location: string;
  mapsQuery?: string;
}) {
  const query = mapsQuery || location;
  return (
    <div>
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <MapPin className="h-4.5 w-4.5 text-primary" /> {title}
      </h2>
      <p className="mt-1 text-sm text-muted">{location}</p>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border">
        <iframe
          title={`${title} map`}
          src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`}
          className="h-64 w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink transition-colors hover:border-primary hover:text-primary"
      >
        <Navigation className="h-3.5 w-3.5" /> Get Directions
      </a>
    </div>
  );
}
