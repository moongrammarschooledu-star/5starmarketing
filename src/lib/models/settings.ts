export interface WebsiteSettings {
  businessName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  logoUrl?: string;
  faviconUrl?: string;
  whatsappDisplayName: string;
  whatsappDefaultGreeting: string;
  whatsappDefaultInquiryMessage: string;
  // Local Business Information (STEP 8) — used for LocalBusiness JSON-LD
  // and as prep for a Google Business Profile. All optional: only
  // populated fields are ever rendered into structured data.
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  websiteUrl?: string;
  businessDescription?: string;
  // SEO defaults (STEP 8) — used as fallbacks for page metadata.
  seoSiteTitle?: string;
  seoSiteDescription?: string;
  seoDefaultOgImage?: string;
  // Appointment Settings (STEP 11) — configurable working days/hours for
  // site-visit booking. Never claimed as real hours unless the admin
  // actually sets them.
  appointmentWorkingDays: string[];
  appointmentOpeningTime: string;
  appointmentClosingTime: string;
  appointmentSlotDurationMinutes: number;
  appointmentBreakStart?: string;
  appointmentBreakEnd?: string;
  appointmentMaxVisitors: number;
  appointmentBookingNoticeHours: number;
  // Automatic Lead Assignment (STEP 14) — 'Manual' (default) means no
  // lead is ever auto-assigned; the admin explicitly opts into
  // 'Round Robin' or 'Least Assigned Leads'.
  leadAssignmentMethod: "Manual" | "Round Robin" | "Least Assigned Leads";
  // Marketing / Attribution (STEP 15). marketingWhatsappNumber
  // deliberately reuses the `whatsapp` field above rather than
  // duplicating it — see settingsService.
  marketingDefaultUtmSource?: string;
  marketingDefaultUtmMedium?: string;
  marketingDefaultCampaign?: string;
  marketingAttributionWindowDays: number;
  marketingDefaultLandingPage?: string;
  // Deals (STEP 18) — a suggested default commission rate (%) admins
  // can configure instead of one being hardcoded; still overridable
  // per deal. Undefined until an admin sets it.
  defaultCommissionRate?: number;
  updatedAt: string;
}

export type WebsiteSettingsInput = Omit<WebsiteSettings, "updatedAt">;
