"use server";

import sharp from "sharp";
import { brochureService } from "@/services/brochureService";
import { activityService } from "@/services/activityService";
import { profileService } from "@/services/profileService";
import { createClient } from "@/lib/supabase/server";
import { canAccess } from "@/lib/permissions";
import { renderFacebookPostImage } from "@/lib/facebookPostImage";
import {
  checkConnection,
  facebookConfigured,
  instagramConfigured,
  publishFacebookPhoto,
  publishInstagramPhoto,
  type ConnectionCheck,
} from "@/lib/social/meta";

const INSTAGRAM_CAPTION_LIMIT = 2200;

export async function testSocialConnectionAction(): Promise<ConnectionCheck & { error?: string }> {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "marketing")) return { error: "You do not have access to Marketing." };
  return checkConnection();
}

export interface PublishResult {
  platform: "Facebook" | "Instagram";
  ok: boolean;
  url?: string;
  error?: string;
}

/** Posts the brochure's picture and the (edited) caption to the chosen accounts.
 *  Each platform is tried on its own: one failing never cancels the other. */
export async function publishBrochurePostAction(
  brochureId: string,
  targets: { facebook: boolean; instagram: boolean },
  caption: string,
): Promise<{ results: PublishResult[]; error?: string }> {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "brochures")) return { results: [], error: "You do not have access to brochures." };

  const text = caption.trim();
  if (!text) return { results: [], error: "The caption is empty." };
  if (!targets.facebook && !targets.instagram) return { results: [], error: "Choose at least one account to post to." };

  let png: ArrayBuffer;
  let title = "Brochure";
  try {
    const brochure = await brochureService.getById(brochureId);
    if (!brochure) return { results: [], error: "This brochure no longer exists." };
    title = brochure.title;
    const data = await brochureService.buildRenderData(brochureId);
    png = await (await renderFacebookPostImage(data, false)).arrayBuffer();
  } catch (e) {
    return { results: [], error: e instanceof Error ? e.message : "Could not prepare the picture." };
  }

  const results: PublishResult[] = [];

  if (targets.facebook) {
    if (!facebookConfigured()) {
      results.push({ platform: "Facebook", ok: false, error: "Facebook is not connected yet." });
    } else {
      try {
        const post = await publishFacebookPhoto(png, text);
        results.push({ platform: "Facebook", ok: true, url: post.url });
        await activityService.log("Posted to Facebook", title, "brochure", brochureId, { url: post.url });
      } catch (e) {
        results.push({ platform: "Facebook", ok: false, error: e instanceof Error ? e.message : "Could not post to Facebook." });
      }
    }
  }

  if (targets.instagram) {
    if (!instagramConfigured()) {
      results.push({ platform: "Instagram", ok: false, error: "Instagram is not connected yet." });
    } else if (text.length > INSTAGRAM_CAPTION_LIMIT) {
      results.push({ platform: "Instagram", ok: false, error: `The caption is ${text.length} characters; Instagram allows ${INSTAGRAM_CAPTION_LIMIT}. Shorten it and try again.` });
    } else {
      // Instagram only takes a JPEG from a public address, so the picture is
      // converted and kept in storage just long enough for Instagram to fetch it.
      const supabase = await createClient();
      const path = `social/${crypto.randomUUID()}.jpg`;
      try {
        const jpeg = await sharp(Buffer.from(png)).flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer();
        const { error: uploadError } = await supabase.storage.from("brochures").upload(path, jpeg, { contentType: "image/jpeg", upsert: false });
        if (uploadError) throw new Error("Could not prepare the picture for Instagram.");
        const { data: pub } = supabase.storage.from("brochures").getPublicUrl(path);
        const post = await publishInstagramPhoto(pub.publicUrl, text);
        results.push({ platform: "Instagram", ok: true, url: post.url });
        await activityService.log("Posted to Instagram", title, "brochure", brochureId, { url: post.url ?? null });
      } catch (e) {
        results.push({ platform: "Instagram", ok: false, error: e instanceof Error ? e.message : "Could not post to Instagram." });
      } finally {
        await supabase.storage.from("brochures").remove([path]).catch(() => undefined);
      }
    }
  }

  return { results };
}
