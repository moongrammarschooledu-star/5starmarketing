import type { Property } from "./models/property";
import type { CustomerContact } from "./models/contact";
import type { PropertyDemand } from "./models/demand";
import { matchPropertiesToDemand, type DemandMatch } from "./demandMatching";

// Suggests properties for a general contact, using the same rules as client
// demands. A contact only gets suggestions when it says at least a type, an
// area, a budget or a size - nothing is guessed from the free-text note.

export function canMatchContact(c: CustomerContact): boolean {
  return Boolean(c.propertyType || c.area || c.budgetMax != null || c.sizeMarla != null);
}

function asDemand(c: CustomerContact, purpose: "For Sale" | "For Rent"): PropertyDemand {
  return {
    id: c.id,
    clientName: c.name,
    clientPhone: c.phone,
    purpose,
    propertyTypes: c.propertyType ? [c.propertyType] : [],
    locations: (c.area ?? "")
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
    budgetMax: c.budgetMax,
    sizeMinMarla: c.sizeMarla,
    sizeMaxMarla: c.sizeMarla,
    priority: "Normal",
    status: "Open",
    showOnSite: false,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/** Available properties that fit this contact, best first. Without a stated
 *  purpose both buying and renting are tried and the better fit is kept. */
export function matchPropertiesToContact(c: CustomerContact, properties: Property[]): DemandMatch[] {
  if (!canMatchContact(c)) return [];
  const purposes = c.purpose ? [c.purpose] : (["For Sale", "For Rent"] as const);
  const best = new Map<string, DemandMatch>();
  for (const p of purposes) {
    for (const m of matchPropertiesToDemand(asDemand(c, p), properties)) {
      const prev = best.get(m.property.id);
      if (!prev || m.score > prev.score) best.set(m.property.id, m);
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}
