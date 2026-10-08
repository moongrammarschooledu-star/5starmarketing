import { formatMarla, formatPrice } from "./pkUnits";
import type { PublicDemandRow } from "./models/news";

const TYPE_LABEL: Record<string, string> = {
  house: "House",
  flat: "Flat",
  residential_plot: "Residential Plot",
  commercial: "Commercial Property",
};

function num(value: number | string | null): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function range(min: number | undefined, max: number | undefined, show: (n: number) => string): string | null {
  if (min !== undefined && max !== undefined) return min === max ? show(min) : `${show(min)} to ${show(max)}`;
  if (max !== undefined) return `up to ${show(max)}`;
  if (min !== undefined) return `from ${show(min)}`;
  return null;
}

/** "5 Marla House to buy in Johar Town - budget up to 1.5 Crore" (the bar
 *  puts a "Wanted" badge in front). Built only from the safe columns of the public view, so there is nothing
 *  here that could reveal who the client is. */
export function publicDemandLine(row: PublicDemandRow): string {
  const sizeMin = num(row.size_min_marla);
  const sizeMax = num(row.size_max_marla);
  const size = range(sizeMin, sizeMax, formatMarla);
  // "up to 10 Marla" reads oddly before a type, so a lone bound is phrased as "10 Marla".
  const sizeText = sizeMin !== undefined && sizeMax !== undefined ? size : sizeMax !== undefined ? formatMarla(sizeMax) : sizeMin !== undefined ? `${formatMarla(sizeMin)}+` : null;

  const types = (row.property_types ?? []).map((t) => TYPE_LABEL[t]).filter(Boolean);
  const what = types.length ? types.join(" / ") : "Property";

  const where = (row.locations ?? []).map((l) => l.trim()).filter(Boolean).slice(0, 3);
  const budget = range(num(row.budget_min), num(row.budget_max), formatPrice);

  const parts = [`${[sizeText, what].filter(Boolean).join(" ")} ${row.purpose === "rent" ? "on rent" : "to buy"}`];
  if (where.length) parts[0] += ` in ${where.join(" / ")}`;
  if (row.min_bedrooms) parts[0] += ` (${row.min_bedrooms}+ bedrooms)`;
  if (budget) parts.push(`budget ${budget}`);
  return parts.join(" - ");
}
