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
