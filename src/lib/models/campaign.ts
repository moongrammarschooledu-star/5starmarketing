export type CampaignPlatform =
  | "Facebook"
  | "Instagram"
  | "TikTok"
  | "Google Ads"
  | "YouTube"
  | "WhatsApp"
  | "Website"
  | "Other";

export const campaignPlatforms: CampaignPlatform[] = [
  "Facebook",
  "Instagram",
  "TikTok",
  "Google Ads",
  "YouTube",
  "WhatsApp",
  "Website",
  "Other",
];

export type CampaignType =
  | "Property Promotion"
  | "Project Promotion"
  | "Brand Awareness"
  | "Lead Generation"
  | "Site Visit"
  | "WhatsApp Campaign"
  | "Investment Campaign"
  | "Other";

export const campaignTypes: CampaignType[] = [
  "Property Promotion",
  "Project Promotion",
  "Brand Awareness",
  "Lead Generation",
  "Site Visit",
  "WhatsApp Campaign",
  "Investment Campaign",
  "Other",
];

export type CampaignStatus = "Draft" | "Active" | "Paused" | "Completed" | "Archived";

export const campaignStatuses: CampaignStatus[] = ["Draft", "Active", "Paused", "Completed", "Archived"];

export interface Campaign {
  id: string;
  name: string;
  platform: CampaignPlatform;
  campaignType: CampaignType;
  status: CampaignStatus;
  startDate?: string;
  endDate?: string;
  plannedBudget?: number;
  actualSpend?: number;
  /** Only ever set from real, admin-verified revenue — never estimated
   *  from a property's asking price. Powers optional ROI. */
  revenueGenerated?: number;
  targetAudience?: string;
  propertyId?: string;
  propertyTitle?: string;
  propertySlug?: string;
  projectId?: string;
  projectTitle?: string;
  projectSlug?: string;
  /** Custom landing page path (e.g. "/campaign/5-marla-lahore"). When a
   *  property/project is selected instead, the landing page is derived
   *  from that property/project's own page. */
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  /** The utm_campaign slug this campaign is tracked under — matched
   *  against incoming visitor UTM params to attribute leads back here. */
  utmCampaign: string;
  utmContent?: string;
  utmTerm?: string;
  description?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export type CampaignInput = Pick<
  Campaign,
  | "name"
  | "platform"
  | "campaignType"
  | "status"
  | "startDate"
  | "endDate"
  | "plannedBudget"
  | "actualSpend"
  | "revenueGenerated"
  | "targetAudience"
  | "propertyId"
  | "projectId"
  | "landingPage"
  | "utmSource"
  | "utmMedium"
  | "utmCampaign"
  | "utmContent"
  | "utmTerm"
  | "description"
>;

/** Real, from-data-only performance for one campaign. Rate fields are
 *  null (never 0 or a guess) when there isn't enough data — the UI must
 *  render "No sufficient data available." rather than a computed 0%. */
export interface CampaignPerformance {
  hasEnoughData: boolean;
  visitors: number;
  leads: number;
  qualifiedLeads: number;
  siteVisits: number;
  closedLeads: number;
  leadConversionRate: number | null;
  qualifiedLeadRate: number | null;
  siteVisitRate: number | null;
  closedLeadRate: number | null;
}

/** null = "Not available" (no spend entered, or dividing by zero). */
export interface CampaignCostAnalytics {
  costPerLead: number | null;
  costPerQualifiedLead: number | null;
  costPerSiteVisit: number | null;
  costPerClosedLead: number | null;
  budget?: number;
  spent?: number;
  remaining: number | null;
  overBudget: boolean;
}

/** null = ROI not calculable — no revenue entered. Never estimated. */
export interface CampaignROI {
  roiPercent: number | null;
  spend?: number;
  revenue?: number;
}

export interface SourceReportRow {
  source: string;
  visitors: number;
  leads: number;
  qualifiedLeads: number;
  siteVisits: number;
  closedLeads: number;
  conversionRate: number | null;
}

export interface MarketingFunnel {
  visitors: number;
  propertyViews: number;
  inquiries: number;
  qualifiedLeads: number;
  siteVisits: number;
  negotiations: number;
  closedLeads: number;
  /** Any stage this deployment genuinely cannot track (currently none —
   *  kept so the UI has a real place to render "Tracking not available."
   *  if a future stage is added without instrumentation). */
  untracked: (keyof Omit<MarketingFunnel, "untracked">)[];
}

export const marketingEventTypes = [
  "page_view",
  "property_view",
  "project_view",
  "whatsapp_click",
  "phone_click",
  "inquiry_submit",
  "qr_scan",
] as const;
export type MarketingEventType = (typeof marketingEventTypes)[number];

export interface AttributionTouch {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  landingPage?: string;
}
