import type { Property } from "@/lib/models/property";
import { PropertyCard } from "./PropertyCard";

export function RelatedProperties({ properties }: { properties: Property[] }) {
  if (properties.length === 0) return null;

  return (
    <div>
      <h2 className="font-heading text-xl font-extrabold text-ink">Similar Properties</h2>
      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {properties.map((p) => (
          <PropertyCard key={p.id} property={p} />
        ))}
      </div>
    </div>
  );
}
