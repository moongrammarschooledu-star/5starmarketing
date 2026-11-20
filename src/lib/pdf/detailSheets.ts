import { site } from "@/lib/site";
import type { Property } from "@/lib/models/property";
import { demandPurposeWord, type PropertyDemand } from "@/lib/models/demand";
import type { RentalProperty } from "@/lib/models/rental";
import type { OwnerDetails } from "@/lib/models/ownerDetails";
import { describeBudget, describeSize } from "@/lib/demandText";

// The content of the printable "office record" sheets (PDF) for demands,
// properties and rental properties. Everything is a short list of points, so a
// sheet reads at a glance on paper. Pure functions - the PDF layout lives in
// DetailSheetDocument.tsx.

export type SheetPoint = string | { label: string; value: string };

export interface SheetSection {
  heading: string;
  points: SheetPoint[];
}

export interface SheetData {
  /** Small line above the title, e.g. "PROPERTY DETAILS - OFFICE RECORD". */
  kind: string;
  title: string;
  /** Serial number shown in the record line. */
  recordNo?: string;
  sections: SheetSection[];
  /** Suggested file name (without .pdf). */
  fileName: string;
}

/** The PDF fonts have Latin letters only: drop emoji and other scripts so nothing prints as a box. */
export function clean(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[^\n -~ -ɏ–—‘-”•…]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Turns free text into short points: one per line, or one per sentence when it is a single paragraph. */
export function toPoints(text: string | undefined | null): string[] {
  if (!text) return [];
  const lines = clean(text)
    .split("\n")
    .map((l) => l.replace(/^[\s\-*•]+/, "").trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  const one = lines[0] ?? "";
  const sentences = one.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
  return sentences.length ? sentences : one ? [one] : [];
}

function pretty(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const rs = (n: number) => `Rs ${n.toLocaleString("en-US")}`;

function day(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
}

function add(points: SheetPoint[], label: string, value: string | number | undefined | null) {
  if (value === undefined || value === null) return;
  const v = clean(String(value));
  if (v) points.push({ label, value: v });
}

function safeName(value: string): string {
  return value.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "details";
}

function ownerSection(owner: OwnerDetails | null | undefined): SheetSection | null {
  if (!owner) return null;
  const points: SheetPoint[] = [];
  add(points, "Name", owner.name);
  add(points, "Phone", owner.phone);
  add(points, "Other phone", owner.altPhone);
  add(points, "Address", owner.address);
  for (const n of toPoints(owner.notes)) points.push(n);
  return points.length ? { heading: "Owner (office record - private)", points } : null;
}

export interface DemandMatchLine {
  serialNo?: string;
  title: string;
  price: string;
  location: string;
  score: number;
  level: string;
}

export function demandSheet(d: PropertyDemand, matches: DemandMatchLine[]): SheetData {
  const client: SheetPoint[] = [];
  add(client, "Name", d.clientName);
  add(client, "Phone", d.clientPhone);
  add(client, "WhatsApp", d.clientWhatsapp);

  const wants: SheetPoint[] = [];
  add(wants, "Wants to", demandPurposeWord(d.purpose));
  add(wants, "Property type", d.propertyTypes.length ? d.propertyTypes.join(", ") : "Any type");
  add(wants, "Areas", d.locations.length ? d.locations.join(", ") : "Anywhere");
  add(wants, "Budget", describeBudget(d));
  add(wants, "Size", describeSize(d));
  if (d.minBedrooms != null) add(wants, "Minimum bedrooms", d.minBedrooms);
  if (d.purpose === "For Rent" && d.familyMembers != null) add(wants, "Family members", d.familyMembers);

  const handling: SheetPoint[] = [];
  add(handling, "Status", d.status);
  add(handling, "Priority", d.priority);
  add(handling, "Assigned to", d.assignedToName ?? "Not assigned");
  add(handling, "Added by", d.createdByName);
  add(handling, "Date added", day(d.createdAt));
  add(handling, "Last updated", day(d.updatedAt));

  const sections: SheetSection[] = [
    { heading: "Client", points: client },
    { heading: "What the client is looking for", points: wants },
    { heading: "Handling", points: handling },
  ];
  const notes = toPoints(d.notes);
  if (notes.length) sections.push({ heading: "Notes", points: notes });
  if (matches.length) {
    sections.push({
      heading: `Matching properties on our list (${matches.length})`,
      points: matches.map((m) => clean(`${m.serialNo ? `${m.serialNo} - ` : ""}${m.title} - ${m.price} (${m.level} match, ${m.score}%)`)),
    });
  }

  return {
    kind: `CLIENT DEMAND (${demandPurposeWord(d.purpose).toUpperCase()}) - OFFICE RECORD`,
    title: clean(d.clientName),
    recordNo: d.serialNo,
    sections,
    fileName: safeName(`${d.serialNo ?? "demand"}-${d.clientName}`),
  };
}

export function propertySheet(p: Property, owner: OwnerDetails | null | undefined): SheetData {
  const rent = p.purpose === "For Rent";

  const main: SheetPoint[] = [];
  add(main, "Reference no.", p.serialNo);
  add(main, "Title", p.title);
  add(main, "For", p.purpose.replace("For ", ""));
  add(main, "Type", p.type);
  add(main, "Status", p.status);

  const place: SheetPoint[] = [];
  add(place, "Location", p.location);
  add(place, "City", p.city);
  add(place, "Size", p.size);
  if (p.sizeSqft != null) add(place, "Size (sq ft)", p.sizeSqft.toLocaleString("en-US"));
  if (p.bedrooms != null) add(place, "Bedrooms", p.bedrooms);
  if (p.bathrooms != null) add(place, "Bathrooms", p.bathrooms);

  const money: SheetPoint[] = [];
  add(money, rent ? "Rent" : "Price", p.price);
  if (!rent) add(money, "Payment", p.paymentOption);
  const plan = p.paymentPlan;
  if (plan.totalPrice != null) add(money, "Plan - total price", rs(plan.totalPrice));
  if (plan.downPayment != null) add(money, "Plan - down payment", rs(plan.downPayment));
  if (plan.monthlyInstallment != null) add(money, "Plan - monthly installment", rs(plan.monthlyInstallment));
  if (plan.durationMonths != null) add(money, "Plan - duration", `${plan.durationMonths} months`);
  if (plan.installmentsCount != null) add(money, "Plan - installments", plan.installmentsCount);

  const sections: SheetSection[] = [
    { heading: "Property", points: main },
    { heading: "Location and size", points: place },
    { heading: rent ? "Rent" : "Price and payment", points: money },
  ];
  const features = p.features.map(clean).filter(Boolean);
  if (features.length) sections.push({ heading: "Features", points: features });
  const amenities = p.amenities.map(clean).filter(Boolean);
  if (amenities.length) sections.push({ heading: "Amenities", points: amenities });
  const description = toPoints(p.description);
  if (description.length) sections.push({ heading: "Description", points: description });
  if (p.documents.length) sections.push({ heading: "Documents on file", points: p.documents.map((d) => clean(d.name)).filter(Boolean) });

  const record: SheetPoint[] = [];
  add(record, "Listed on", day(p.createdAt));
  add(record, "Last updated", day(p.updatedAt));
  if (p.status !== "Inactive") add(record, "On our website", `${site.websiteUrl}/properties/${p.slug}`);
  sections.push({ heading: "Record", points: record });

  const o = ownerSection(owner);
  if (o) sections.push(o);

  return {
    kind: `PROPERTY DETAILS (${rent ? "RENT" : "SALE"}) - OFFICE RECORD`,
    title: clean(p.title),
    recordNo: p.serialNo,
    sections,
    fileName: safeName(`${p.serialNo ?? "property"}-${p.title}`),
  };
}

export function rentalSheet(rp: RentalProperty, property: Property | undefined, owner: OwnerDetails | null | undefined): SheetData {
  const terms: SheetPoint[] = [];
  add(terms, "Status", pretty(rp.rentalStatus));
  if (rp.monthlyRent != null) add(terms, "Monthly rent", rs(rp.monthlyRent));
  if (rp.securityDepositAmount != null) add(terms, "Security deposit", rs(rp.securityDepositAmount));
  add(terms, "Available from", day(rp.availableDate));
  add(terms, "Furnishing", pretty(rp.furnishedStatus));
  add(terms, "Utilities paid by", pretty(rp.utilitiesResponsibility));
  add(terms, "Maintenance by", pretty(rp.maintenanceResponsibility));
  add(terms, "Unit", rp.unitNumber);

  const people: SheetPoint[] = [];
  add(people, "Landlord", rp.landlordName);
  add(people, "Property manager", rp.propertyManagerName);

  const linked: SheetPoint[] = [];
  add(linked, "Reference no.", property?.serialNo);
  add(linked, "Property", property?.title ?? rp.propertyTitle);
  add(linked, "Location", property?.location ?? rp.propertyLocation);
  if (property) {
    add(linked, "Type", property.type);
    add(linked, "Size", property.size);
    if (property.bedrooms != null) add(linked, "Bedrooms", property.bedrooms);
    if (property.bathrooms != null) add(linked, "Bathrooms", property.bathrooms);
  }

  const sections: SheetSection[] = [{ heading: "Rental terms", points: terms }];
  if (people.length) sections.push({ heading: "People", points: people });
  if (linked.length) sections.push({ heading: "The property", points: linked });
  const features = (property?.features ?? []).map(clean).filter(Boolean);
  if (features.length) sections.push({ heading: "Features", points: features });
  const notes = toPoints(rp.notes);
  if (notes.length) sections.push({ heading: "Notes", points: notes });
  const record: SheetPoint[] = [];
  add(record, "Added on", day(rp.createdAt));
  add(record, "Last updated", day(rp.updatedAt));
  sections.push({ heading: "Record", points: record });
  const o = ownerSection(owner);
  if (o) sections.push(o);

  const title = property?.title ?? rp.propertyTitle ?? "Rental property";
  return {
    kind: "RENTAL PROPERTY - OFFICE RECORD",
    title: clean(title),
    recordNo: property?.serialNo,
    sections,
    fileName: safeName(`${property?.serialNo ?? "rental"}-${title}`),
  };
}
