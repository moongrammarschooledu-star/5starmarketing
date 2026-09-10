// Shared Property model — used by both the public site and the admin
// dashboard. This is the app-facing shape (UI-friendly labels like
// "House", "For Sale"); src/services/propertyService.ts maps it to/from
// the DB's snake_case enum values (house, sale, ...) so this file and
// every component that imports it never has to change.

export type PropertyType = "House" | "Flat" | "Residential Plot" | "Commercial Property";
export type Purpose = "For Sale" | "For Rent" | "Investment";
export type PropertyStatus = "Available" | "Reserved" | "Sold" | "Inactive";
export type PaymentOption = "Cash" | "Installments" | "Cash / Installments";
export type SizeCategory = "3 Marla" | "5 Marla" | "10 Marla" | "1 Kanal" | "Custom";
export type LocationArea = "Lahore" | "Johar Town" | "Other Locations";

export interface PropertyDocument {
  name: string;
  url: string;
}

/** All fields optional — a payment plan is only ever shown on the public
 *  site for the values an admin actually entered (see PropertyPaymentPlan). */
export interface PropertyPaymentPlan {
  totalPrice?: number;
  downPayment?: number;
  monthlyInstallment?: number;
  durationMonths?: number;
  installmentsCount?: number;
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  type: PropertyType;
  purpose: Purpose;
  location: string;
  locationArea: LocationArea;
  // STEP 16 — city is its own field (for the Country → City → Area
  // hierarchy) distinct from `locationArea`'s coarse 3-value enum and
  // `location`'s free-text address/locality line.
  city: string;
  size: string;
  sizeCategory: SizeCategory;
  /** STEP 16 — normalized size in square feet, entered by the admin.
   *  Powers accurate numeric min/max size filtering; the free-text
   *  `size`/`sizeCategory` fields above stay display-only and are never
   *  parsed for comparison. Undefined on properties an admin hasn't
   *  filled this in for yet — those simply don't match a size filter. */
  sizeSqft?: number;
  /** STEP 16 — only meaningful for residential property types; left
   *  undefined (never 0) for plots/commercial so bedroom filters can't
   *  produce misleading matches. */
  bedrooms?: number;
  bathrooms?: number;
  price: string;
  priceValue?: number;
  paymentOption: PaymentOption;
  status: PropertyStatus;
  featured: boolean;
  images: string[];
  description: string;
  features: string[];
  amenities: string[];
  mapsQuery?: string;
  /** STEP 16 — real coordinates only; undefined until an admin sets them
   *  via the map picker. Never inferred/randomized. */
  latitude?: number;
  longitude?: number;
  projectId?: string;
  paymentPlan: PropertyPaymentPlan;
  documents: PropertyDocument[];
  createdAt: string;
  updatedAt: string;
}

export type PropertyInput = Omit<Property, "id" | "slug" | "createdAt" | "updatedAt">;

export const propertyTypes: PropertyType[] = [
  "House",
  "Flat",
  "Residential Plot",
  "Commercial Property",
];
export const purposes: Purpose[] = ["For Sale", "For Rent", "Investment"];
export const propertyStatuses: PropertyStatus[] = [
  "Available",
  "Reserved",
  "Sold",
  "Inactive",
];
export const paymentOptions: PaymentOption[] = ["Cash", "Installments", "Cash / Installments"];
export const locationAreas: LocationArea[] = ["Lahore", "Johar Town", "Other Locations"];
export const sizeCategories: SizeCategory[] = [
  "3 Marla",
  "5 Marla",
  "10 Marla",
  "1 Kanal",
  "Custom",
];
export const priceRanges: { label: string; min: number; max: number }[] = [
  { label: "Any Budget", min: 0, max: Infinity },
  { label: "Under 50 Lac", min: 0, max: 5000000 },
  { label: "50 Lac - 1 Crore", min: 5000000, max: 10000000 },
  { label: "1 Crore - 2 Crore", min: 10000000, max: 20000000 },
  { label: "2 Crore+", min: 20000000, max: Infinity },
];
