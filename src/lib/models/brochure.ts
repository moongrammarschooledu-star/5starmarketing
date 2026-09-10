export type BrochureType = "property" | "project";

export const brochureSectionKeys = [
  "cover",
  "overview",
  "gallery",
  "features",
  "amenities",
  "paymentPlan",
  "location",
  "contact",
  "whatsappCta",
  "disclaimer",
] as const;

export type BrochureSectionKey = (typeof brochureSectionKeys)[number];

export const brochureSectionLabels: Record<BrochureSectionKey, string> = {
  cover: "Cover",
  overview: "Property/Project Overview",
  gallery: "Image Gallery",
  features: "Features",
  amenities: "Amenities",
  paymentPlan: "Payment Plan",
  location: "Location",
  contact: "Contact Information",
  whatsappCta: "WhatsApp CTA",
  disclaimer: "Disclaimer",
};

export interface Brochure {
  id: string;
  propertyId?: string;
  projectId?: string;
  type: BrochureType;
  title: string;
  slug: string;
  selectedSections: BrochureSectionKey[];
  generatedFile?: string;
  public: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrochureSummary extends Brochure {
  targetName: string;
  targetSlug: string;
}

export interface BrochureInput {
  title: string;
  selectedSections: BrochureSectionKey[];
}
