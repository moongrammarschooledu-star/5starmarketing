// STEP 32 — Public Portal content models: blog posts, CMS landing
// pages, and admin-approved testimonials.

export type BlogCategory =
  | "Property Tips"
  | "Investment Education"
  | "Buying Guide"
  | "Selling Guide"
  | "Rental Guide"
  | "Construction"
  | "Market Education";

export const blogCategories: BlogCategory[] = [
  "Property Tips",
  "Investment Education",
  "Buying Guide",
  "Selling Guide",
  "Rental Guide",
  "Construction",
  "Market Education",
];

export type BlogStatus = "DRAFT" | "PUBLISHED";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  authorName: string;
  category: BlogCategory;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  status: BlogStatus;
  publishedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type BlogPostInput = Omit<BlogPost, "id" | "createdAt" | "updatedAt" | "createdBy">;

export interface LandingPageFaqItem {
  question: string;
  answer: string;
}

export interface PublicLandingPage {
  id: string;
  slug: string;
  title: string;
  heroImage?: string;
  description: string;
  propertyId?: string;
  propertyTitle?: string;
  propertySlug?: string;
  projectId?: string;
  projectName?: string;
  projectSlug?: string;
  ctaLabel: string;
  faqItems: LandingPageFaqItem[];
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  campaignSource?: string;
  campaignMedium?: string;
  campaignName?: string;
  active: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type PublicLandingPageInput = Omit<
  PublicLandingPage,
  "id" | "createdAt" | "updatedAt" | "createdBy" | "propertyTitle" | "propertySlug" | "projectName" | "projectSlug"
>;

export interface PublicTestimonial {
  id: string;
  customerDisplayName: string;
  review: string;
  rating?: number;
  propertyId?: string;
  propertyTitle?: string;
  approved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
}

export type PublicTestimonialInput = Pick<PublicTestimonial, "customerDisplayName" | "review" | "rating" | "propertyId">;
