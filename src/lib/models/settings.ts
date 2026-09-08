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
  updatedAt: string;
}

export type WebsiteSettingsInput = Omit<WebsiteSettings, "updatedAt">;
