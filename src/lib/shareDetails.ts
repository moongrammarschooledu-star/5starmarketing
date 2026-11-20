import { site } from "@/lib/site";
import type { Property } from "@/lib/models/property";
import { demandPurposeWord, type PropertyDemand } from "@/lib/models/demand";
import { describeBudget, describeSize } from "@/lib/demandText";

// Builds the "please check these details" WhatsApp / SMS text that is sent
// to the owner right after a property is saved, or to the client right after
// a demand is saved. Everything the team typed in is repeated back so the
// person can spot a mistake, and the company's own details are added so they
// can save the number and reach us. Staff-only data (internal notes, the
// owner's own number, priority, who it is assigned to) is never included.

/** The company's details, as a block that goes at the end of the message. */
export function companyDetailLines(): string[] {
  return [
    "---",
    site.fullName,
    `Phone / WhatsApp: ${site.phoneDisplay2}`,
    `Address: ${site.address}`,
    `Website: ${site.websiteUrl}`,
    `Email: ${site.displayEmail}`,
  ];
}

const DESCRIPTION_LIMIT = 500;

/** Keeps the line breaks the team typed, but removes stray spaces and blank-line runs. */
function tidyText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Every detail of a saved property, one per line. */
export function propertyShareLines(p: Property): string[] {
  const rent = p.purpose === "For Rent";
  // Many titles/locations already end with the city - do not print it twice.
  const place = p.city && !p.location.toLowerCase().includes(p.city.toLowerCase()) ? `${p.location}, ${p.city}` : p.location;

  const lines: string[] = [];
  if (p.serialNo) lines.push(`Ref: ${p.serialNo}`);
  lines.push(`Property: ${p.title}`);
  lines.push(`For: ${p.purpose.replace("For ", "")}`);
  lines.push(`Type: ${p.type}`);
  lines.push(`Location: ${place}`);
  lines.push(`Size: ${p.size}`);
  if (p.bedrooms != null) lines.push(`Bedrooms: ${p.bedrooms}`);
  if (p.bathrooms != null) lines.push(`Bathrooms: ${p.bathrooms}`);
  lines.push(`${rent ? "Rent" : "Price"}: ${p.price}`);
  if (!rent) lines.push(`Payment: ${p.paymentOption}`);
  lines.push(`Status: ${p.status}`);
  if (p.features.length) lines.push(`Features: ${p.features.join(", ")}`);
  if (p.amenities.length) lines.push(`Amenities: ${p.amenities.join(", ")}`);
  const description = tidyText(p.description);
  if (description) lines.push("Description:", description.length > DESCRIPTION_LIMIT ? `${description.slice(0, DESCRIPTION_LIMIT).trimEnd()}...` : description);
  if (p.status !== "Inactive") lines.push(`On our website: ${site.websiteUrl}/properties/${p.slug}`);
  return [...lines, "", ...companyDetailLines()];
}

/** A property's details for another real estate agent: what they need to offer it to their own
 *  clients, with the link to the full details and photos. The owner's private details are never included. */
export function propertyAgentLines(p: Property): string[] {
  const rent = p.purpose === "For Rent";
  const place = p.city && !p.location.toLowerCase().includes(p.city.toLowerCase()) ? `${p.location}, ${p.city}` : p.location;
  const lines: string[] = [];
  if (p.serialNo) lines.push(`Ref: ${p.serialNo}`);
  lines.push(tidyText(p.title));
  lines.push(`For: ${p.purpose.replace("For ", "")} | ${p.type}`);
  lines.push(`Location: ${place}`);
  lines.push(`Size: ${p.size}`);
  if (p.bedrooms != null) lines.push(`Bedrooms: ${p.bedrooms}${p.bathrooms != null ? ` | Bathrooms: ${p.bathrooms}` : ""}`);
  lines.push(`${rent ? "Rent" : "Price"}: ${p.price}`);
  const extras = [...p.features, ...p.amenities].slice(0, 6);
  if (extras.length) lines.push(`Features: ${extras.join(", ")}`);
  lines.push(`Photos and full details: ${site.websiteUrl}/properties/${p.slug}`);
  return lines;
}

export const PROPERTY_CONFIRM_TEXT =
  "We have saved your property in our system. Please read every line below carefully and tell us right away if anything is wrong or missing, so we can correct it before showing it to buyers.";

/** Every detail of a saved demand, in the client's own words. */
export function demandShareLines(d: PropertyDemand): string[] {
  const lines: string[] = [];
  if (d.serialNo) lines.push(`Ref: ${d.serialNo}`);
  lines.push(`You want to: ${demandPurposeWord(d.purpose)}`);
  lines.push(`Property type: ${d.propertyTypes.length ? d.propertyTypes.join(", ") : "Any type"}`);
  lines.push(`Areas: ${d.locations.length ? d.locations.join(", ") : "Anywhere"}`);
  lines.push(`Budget: ${describeBudget(d)}`);
  lines.push(`Size: ${describeSize(d)}`);
  if (d.minBedrooms != null) lines.push(`Bedrooms: ${d.minBedrooms}+`);
  if (d.purpose === "For Rent" && d.familyMembers != null) lines.push(`Family members: ${d.familyMembers}`);
  return [...lines, "", ...companyDetailLines()];
}

export const DEMAND_CONFIRM_TEXT =
  "Thank you for telling us what you are looking for. We have noted your requirement as below. Please check every line and tell us right away if anything is wrong, so we can find the right property for you.";
