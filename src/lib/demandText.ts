import type { PropertyDemand } from "./models/demand";
import { formatMarla, formatPrice } from "./pkUnits";

function range(min: number | undefined, max: number | undefined, show: (n: number) => string): string | null {
  if (min != null && max != null) return min === max ? show(min) : `${show(min)} - ${show(max)}`;
  if (max != null) return `up to ${show(max)}`;
  if (min != null) return `from ${show(min)}`;
  return null;
}

export function describeBudget(d: PropertyDemand): string {
  return range(d.budgetMin, d.budgetMax, formatPrice) ?? "Any budget";
}

export function describeSize(d: PropertyDemand): string {
  return range(d.sizeMinMarla, d.sizeMaxMarla, formatMarla) ?? "Any size";
}

/** "Buy - House, Flat - Johar Town, DHA - up to 1.5 Crore - 8 Marla - 3+ bedrooms" */
export function describeDemand(d: PropertyDemand): string {
  const parts = [
    d.purpose === "For Sale" ? "Buy" : "Rent",
    d.propertyTypes.length ? d.propertyTypes.join(", ") : "Any type",
    d.locations.length ? d.locations.join(", ") : "Anywhere",
    describeBudget(d),
    describeSize(d),
  ];
  if (d.minBedrooms != null) parts.push(`${d.minBedrooms}+ bedrooms`);
  return parts.join(" - ");
}
