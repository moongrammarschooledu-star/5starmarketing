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

export interface Property {
  id: string;
  slug: string;
  title: string;
  type: PropertyType;
  purpose: Purpose;
  location: string;
  locationArea: LocationArea;
  size: string;
  sizeCategory: SizeCategory;
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
