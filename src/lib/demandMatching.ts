import type { Property } from "./models/property";
import type { MatchLevel, PropertyDemand } from "./models/demand";
import { formatMarla, formatPrice, parsePriceText, parseSizeToMarla, SQFT_PER_MARLA } from "./pkUnits";

// Matches a client's demand with a property (or the other way round). Pure
// and deterministic - no database access - so it can be checked on its own.
//
// Most properties were entered with the price and size only as text ("3 Crore
// 65 Lac", "22 Marla"), so those are read with pkUnits instead of relying on
// the numeric fields, which are mostly empty. Whatever a property does not say
// is never guessed: it scores half and is listed under "concerns".

export interface DemandMatch {
  property: Property;
  /** 55-100. */
  score: number;
  level: MatchLevel;
  /** What fits, in plain words. */
  reasons: string[];
  /** What does not fit or is unknown. */
  concerns: string[];
}

const POINTS = { base: 20, location: 25, budget: 30, size: 15, bedrooms: 10 };
/** A property up to this much over the maximum budget still shows, flagged. */
const OVER_BUDGET_TOLERANCE = 0.15;
/** A property up to this much outside the wanted size still shows, flagged. */
const SIZE_SLACK = 0.2;
/** Beyond this the size is simply a different kind of property. */
const SIZE_HARD_LIMIT = 0.35;
const MIN_SCORE = 55;
const LOCATION_MISS_CAP = 65;
const SIZE_MISS_CAP = 84;

export function levelForScore(score: number): MatchLevel {
  return score >= 85 ? "Strong" : score >= 70 ? "Good" : "Partial";
}

function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** The property's price in rupees: the numeric field when an admin filled it
 *  in, otherwise read from the price text. */
export function propertyPriceValue(p: Property): number | null {
  if (p.priceValue && p.priceValue > 0) return p.priceValue;
  return parsePriceText(p.price);
}

/** The property's size in Marla. The size text comes first (it is what the
 *  admin actually typed and checked); square feet is the fallback. */
export function propertySizeMarla(p: Property): number | null {
  const fromText = parseSizeToMarla(p.size);
  if (fromText !== null) return fromText;
  return p.sizeSqft && p.sizeSqft > 0 ? Math.round((p.sizeSqft / SQFT_PER_MARLA) * 100) / 100 : null;
}

function locationMatches(wanted: string, haystack: string): boolean {
  const w = norm(wanted);
  if (!w) return false;
  if (` ${haystack} `.includes(` ${w} `)) return true;
  const words = haystack.split(" ");
  return w.split(" ").every((token) => token.length >= 2 && words.some((word) => word === token || word.startsWith(token)));
}

export function matchPropertyToDemand(demand: PropertyDemand, property: Property): DemandMatch | null {
  if (property.status !== "Available") return null;

  const purposeOk = property.purpose === demand.purpose || (demand.purpose === "For Sale" && property.purpose === "Investment");
  if (!purposeOk) return null;
  if (demand.propertyTypes.length > 0 && !demand.propertyTypes.includes(property.type)) return null;

  const reasons: string[] = [`${property.type}, ${property.purpose}`];
  const concerns: string[] = [];
  let score = POINTS.base;
  let cap = 100;

  // Area
  if (demand.locations.length > 0) {
    // `locationArea` is "Lahore" by default on almost every property (even
    // ones in other cities), so only a specific value like "Johar Town" counts.
    const specificArea = property.locationArea === "Lahore" || property.locationArea === "Other Locations" ? "" : property.locationArea;
    const haystack = norm([property.location, property.city, property.title, specificArea, property.mapsQuery ?? ""].join(" "));
    const hit = demand.locations.find((loc) => locationMatches(loc, haystack));
    if (hit) {
      score += POINTS.location;
      reasons.push(`Area matches (${hit})`);
    } else {
      concerns.push("Different area");
      cap = LOCATION_MISS_CAP;
    }
  } else {
    score += POINTS.location;
  }

  // Budget
  if (demand.budgetMin != null || demand.budgetMax != null) {
    const price = propertyPriceValue(property);
    if (price === null) {
      score += POINTS.budget * 0.5;
      concerns.push("Price not entered on the property");
    } else if (demand.budgetMax != null && price > demand.budgetMax) {
      const over = (price - demand.budgetMax) / demand.budgetMax;
      if (over > OVER_BUDGET_TOLERANCE) return null;
      score += POINTS.budget * 0.4;
      concerns.push(`${Math.round(over * 100)}% above budget (${formatPrice(price)})`);
    } else if (demand.budgetMin != null && price < demand.budgetMin * 0.7) {
      score += POINTS.budget * 0.8;
      reasons.push(`Well below budget (${formatPrice(price)})`);
    } else {
      score += POINTS.budget;
      reasons.push(`Within budget (${formatPrice(price)})`);
    }
  } else {
    score += POINTS.budget;
  }

  // Size
  if (demand.sizeMinMarla != null || demand.sizeMaxMarla != null) {
    const marla = propertySizeMarla(property);
    if (marla === null) {
      score += POINTS.size * 0.5;
      concerns.push("Size not readable on the property");
    } else {
      const min = demand.sizeMinMarla ?? 0;
      const max = demand.sizeMaxMarla ?? Infinity;
      if (marla >= min && marla <= max) {
        score += POINTS.size;
        reasons.push(`Size fits (${formatMarla(marla)})`);
      } else {
        const bound = marla < min ? min : max;
        const off = Math.abs(marla - bound) / bound;
        if (off > SIZE_HARD_LIMIT) return null;
        if (off <= SIZE_SLACK) score += POINTS.size * 0.5;
        // Outside the wanted size is never a "Strong" match, however close.
        cap = Math.min(cap, SIZE_MISS_CAP);
        concerns.push(`${marla < min ? "Smaller" : "Larger"} than wanted (${formatMarla(marla)})`);
      }
    }
  } else {
    score += POINTS.size;
  }

  // Bedrooms
  if (demand.minBedrooms != null) {
    if (property.bedrooms == null) {
      score += POINTS.bedrooms * 0.5;
      concerns.push("Bedrooms not entered on the property");
    } else if (property.bedrooms >= demand.minBedrooms) {
      score += POINTS.bedrooms;
      reasons.push(`${property.bedrooms} bedrooms`);
    } else {
      concerns.push(`Only ${property.bedrooms} bedrooms`);
    }
  } else {
    score += POINTS.bedrooms;
  }

  const final = Math.round(Math.min(score, cap));
  if (final < MIN_SCORE) return null;
  return { property, score: final, level: levelForScore(final), reasons, concerns };
}

/** Every available property that fits this demand, best first. */
export function matchPropertiesToDemand(demand: PropertyDemand, properties: Property[]): DemandMatch[] {
  return properties
    .map((p) => matchPropertyToDemand(demand, p))
    .filter((m): m is DemandMatch => m !== null)
    .sort((a, b) => b.score - a.score || b.property.createdAt.localeCompare(a.property.createdAt));
}

export interface DemandForProperty {
  demand: PropertyDemand;
  match: DemandMatch;
}

/** The other direction: which still-open demands fit this property, best first. */
export function matchDemandsToProperty(property: Property, demands: PropertyDemand[]): DemandForProperty[] {
  return demands
    .filter((d) => d.status === "Open" || d.status === "Matched")
    .map((demand) => ({ demand, match: matchPropertyToDemand(demand, property) }))
    .filter((x): x is DemandForProperty => x.match !== null)
    .sort((a, b) => b.match.score - a.match.score);
}
