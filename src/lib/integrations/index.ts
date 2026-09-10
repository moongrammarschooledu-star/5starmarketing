import "server-only";

/** Architecture prep for future ad-platform integrations (STEP 15,
 *  section 35). NONE of these are connected today — this module only
 *  reports whether the necessary credentials exist in the environment,
 *  never pretends a connection exists, and never calls out to any of
 *  these platforms. Adding a real integration later means implementing
 *  the fetch logic behind isConfigured() here — every admin page that
 *  displays these already renders "Integration not configured." until
 *  isConfigured() returns true, so no UI changes are needed to go live. */
export interface PlatformIntegration {
  id: "meta_ads" | "google_ads" | "tiktok_ads" | "google_analytics";
  name: string;
  isConfigured: boolean;
}

export function listPlatformIntegrations(): PlatformIntegration[] {
  return [
    {
      id: "meta_ads",
      name: "Meta Ads (Facebook & Instagram)",
      isConfigured: Boolean(process.env.META_ADS_ACCESS_TOKEN && process.env.META_ADS_ACCOUNT_ID),
    },
    {
      id: "google_ads",
      name: "Google Ads",
      isConfigured: Boolean(process.env.GOOGLE_ADS_DEVELOPER_TOKEN && process.env.GOOGLE_ADS_CUSTOMER_ID),
    },
    {
      id: "tiktok_ads",
      name: "TikTok Ads",
      isConfigured: Boolean(process.env.TIKTOK_ADS_ACCESS_TOKEN && process.env.TIKTOK_ADS_ADVERTISER_ID),
    },
    {
      id: "google_analytics",
      name: "Google Analytics (reporting API)",
      isConfigured: Boolean(process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON),
    },
  ];
}
