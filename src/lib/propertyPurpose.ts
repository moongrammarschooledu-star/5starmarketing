import type { Purpose } from "./models/property";

// How the website splits properties into "For Sale" and "For Rent" (and
// "Investment"). The admin picks the purpose when adding a property; that one
// choice decides which part of the public site shows it.

export const PURPOSE_SLUG: Record<Purpose, string> = {
  "For Sale": "sale",
  "For Rent": "rent",
  Investment: "investment",
};

export const PURPOSE_HINT: Record<Purpose, string> = {
  "For Sale": "Shows in the \"For Sale\" part of the website",
  "For Rent": "Shows in the \"For Rent\" part of the website",
  Investment: "Shows in the \"Investment\" part of the website",
};

/** Pill colours on property cards, so sale and rent are easy to tell apart. */
export const PURPOSE_PILL: Record<Purpose, string> = {
  "For Sale": "bg-ink/80 text-white",
  "For Rent": "bg-sky-600 text-white",
  Investment: "bg-amber-500 text-ink",
};

export const PURPOSE_PAGE: Record<Purpose, { title: string; text: string }> = {
  "For Sale": {
    title: "Properties for Sale in Lahore",
    text: "Houses, flats, plots and commercial properties you can buy - filter by location, budget and size, or explore the map.",
  },
  "For Rent": {
    title: "Properties for Rent in Lahore",
    text: "Houses, flats and commercial properties available on rent - filter by area, monthly rent and size, or explore the map.",
  },
  Investment: {
    title: "Investment Properties in Lahore",
    text: "Properties chosen for investment - compare prices, locations and returns before you decide.",
  },
};

/** A rent price is a monthly figure: show "/ month" unless the admin already wrote the period. */
export function priceWithPeriod(price: string, purpose: Purpose): string {
  if (purpose !== "For Rent") return price;
  if (/month|monthly|per\s+(year|annum|day|week)|\/\s*(m|mo|yr|year|day|week)\b/i.test(price)) return price;
  return `${price} / month`;
}
