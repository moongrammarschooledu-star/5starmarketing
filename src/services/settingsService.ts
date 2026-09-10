import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { WebsiteSettings, WebsiteSettingsInput } from "@/lib/models/settings";
import { resolvePropertyImages } from "./propertyService";

/** Logo/favicon share the same property-images Storage bucket — there's
 *  no separate bucket for site assets, and this one already has the right
 *  public-read / authenticated-write policies. */
async function resolveSingleImage(value: string | undefined): Promise<string | undefined> {
  if (!value) return value;
  const [resolved] = await resolvePropertyImages([value]);
  return resolved;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToSettings(row: any): WebsiteSettings {
  return {
    businessName: row.business_name,
    tagline: row.tagline,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    address: row.address,
    facebookUrl: row.facebook_url ?? "",
    instagramUrl: row.instagram_url ?? "",
    tiktokUrl: row.tiktok_url ?? "",
    youtubeUrl: row.youtube_url ?? "",
    logoUrl: row.logo_url ?? undefined,
    faviconUrl: row.favicon_url ?? undefined,
    whatsappDisplayName: row.whatsapp_display_name ?? "5STAR.M Estate & Builders",
    whatsappDefaultGreeting: row.whatsapp_default_greeting ?? "",
    whatsappDefaultInquiryMessage: row.whatsapp_default_inquiry_message ?? "",
    city: row.city ?? undefined,
    country: row.country ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    businessDescription: row.business_description ?? undefined,
    seoSiteTitle: row.seo_site_title ?? undefined,
    seoSiteDescription: row.seo_site_description ?? undefined,
    seoDefaultOgImage: row.seo_default_og_image ?? undefined,
    appointmentWorkingDays: row.appointment_working_days ?? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    appointmentOpeningTime: (row.appointment_opening_time ?? "10:00").slice(0, 5),
    appointmentClosingTime: (row.appointment_closing_time ?? "18:00").slice(0, 5),
    appointmentSlotDurationMinutes: row.appointment_slot_duration_minutes ?? 60,
    appointmentBreakStart: row.appointment_break_start ? String(row.appointment_break_start).slice(0, 5) : undefined,
    appointmentBreakEnd: row.appointment_break_end ? String(row.appointment_break_end).slice(0, 5) : undefined,
    appointmentMaxVisitors: row.appointment_max_visitors ?? 10,
    appointmentBookingNoticeHours: row.appointment_booking_notice_hours ?? 2,
    leadAssignmentMethod: row.lead_assignment_method ?? "Manual",
    marketingDefaultUtmSource: row.marketing_default_utm_source ?? undefined,
    marketingDefaultUtmMedium: row.marketing_default_utm_medium ?? undefined,
    marketingDefaultCampaign: row.marketing_default_campaign ?? undefined,
    marketingAttributionWindowDays: row.marketing_attribution_window_days ?? 30,
    marketingDefaultLandingPage: row.marketing_default_landing_page ?? undefined,
    defaultCommissionRate: row.default_commission_rate ?? undefined,
    updatedAt: row.updated_at,
  };
}

export const settingsService = {
  async get(): Promise<WebsiteSettings> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("website_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (error) {
      console.error("settingsService.get failed:", error);
      throw new Error("Could not load website settings.");
    }
    return mapRowToSettings(data);
  },

  async update(input: Partial<WebsiteSettingsInput>): Promise<WebsiteSettings> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.businessName !== undefined) row.business_name = input.businessName;
    if (input.tagline !== undefined) row.tagline = input.tagline;
    if (input.phone !== undefined) row.phone = input.phone;
    if (input.whatsapp !== undefined) row.whatsapp = input.whatsapp;
    if (input.email !== undefined) row.email = input.email;
    if (input.address !== undefined) row.address = input.address;
    if (input.facebookUrl !== undefined) row.facebook_url = input.facebookUrl;
    if (input.instagramUrl !== undefined) row.instagram_url = input.instagramUrl;
    if (input.tiktokUrl !== undefined) row.tiktok_url = input.tiktokUrl;
    if (input.youtubeUrl !== undefined) row.youtube_url = input.youtubeUrl;
    if (input.logoUrl !== undefined) row.logo_url = (await resolveSingleImage(input.logoUrl)) || null;
    if (input.faviconUrl !== undefined)
      row.favicon_url = (await resolveSingleImage(input.faviconUrl)) || null;
    if (input.whatsappDisplayName !== undefined) row.whatsapp_display_name = input.whatsappDisplayName;
    if (input.whatsappDefaultGreeting !== undefined) row.whatsapp_default_greeting = input.whatsappDefaultGreeting;
    if (input.whatsappDefaultInquiryMessage !== undefined)
      row.whatsapp_default_inquiry_message = input.whatsappDefaultInquiryMessage;
    if (input.city !== undefined) row.city = input.city || null;
    if (input.country !== undefined) row.country = input.country || null;
    if (input.latitude !== undefined) row.latitude = input.latitude ?? null;
    if (input.longitude !== undefined) row.longitude = input.longitude ?? null;
    if (input.websiteUrl !== undefined) row.website_url = input.websiteUrl || null;
    if (input.businessDescription !== undefined) row.business_description = input.businessDescription || null;
    if (input.seoSiteTitle !== undefined) row.seo_site_title = input.seoSiteTitle || null;
    if (input.seoSiteDescription !== undefined) row.seo_site_description = input.seoSiteDescription || null;
    if (input.seoDefaultOgImage !== undefined)
      row.seo_default_og_image = (await resolveSingleImage(input.seoDefaultOgImage)) || null;
    if (input.appointmentWorkingDays !== undefined) row.appointment_working_days = input.appointmentWorkingDays;
    if (input.appointmentOpeningTime !== undefined) row.appointment_opening_time = input.appointmentOpeningTime;
    if (input.appointmentClosingTime !== undefined) row.appointment_closing_time = input.appointmentClosingTime;
    if (input.appointmentSlotDurationMinutes !== undefined)
      row.appointment_slot_duration_minutes = input.appointmentSlotDurationMinutes;
    if (input.appointmentBreakStart !== undefined) row.appointment_break_start = input.appointmentBreakStart || null;
    if (input.appointmentBreakEnd !== undefined) row.appointment_break_end = input.appointmentBreakEnd || null;
    if (input.appointmentMaxVisitors !== undefined) row.appointment_max_visitors = input.appointmentMaxVisitors;
    if (input.appointmentBookingNoticeHours !== undefined)
      row.appointment_booking_notice_hours = input.appointmentBookingNoticeHours;
    if (input.leadAssignmentMethod !== undefined) row.lead_assignment_method = input.leadAssignmentMethod;
    if (input.marketingDefaultUtmSource !== undefined) row.marketing_default_utm_source = input.marketingDefaultUtmSource || null;
    if (input.marketingDefaultUtmMedium !== undefined) row.marketing_default_utm_medium = input.marketingDefaultUtmMedium || null;
    if (input.marketingDefaultCampaign !== undefined) row.marketing_default_campaign = input.marketingDefaultCampaign || null;
    if (input.marketingAttributionWindowDays !== undefined) row.marketing_attribution_window_days = input.marketingAttributionWindowDays;
    if (input.marketingDefaultLandingPage !== undefined) row.marketing_default_landing_page = input.marketingDefaultLandingPage || null;
    if (input.defaultCommissionRate !== undefined) row.default_commission_rate = input.defaultCommissionRate ?? null;

    const { data, error } = await supabase
      .from("website_settings")
      .update(row)
      .eq("id", 1)
      .select("*")
      .single();
    if (error) {
      console.error("settingsService.update failed:", error);
      throw new Error("Could not save website settings.");
    }
    return mapRowToSettings(data);
  },
};
