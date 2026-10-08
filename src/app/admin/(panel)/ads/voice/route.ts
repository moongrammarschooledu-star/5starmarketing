import { NextResponse } from "next/server";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { site } from "@/lib/site";
import { buildAdNarration, synthesizeSpeech } from "@/lib/narration";
import { parseAdRequest } from "@/lib/adMaker";
import { isRateLimited } from "@/lib/rateLimit";

// POST (not GET): every call can cost text-to-speech credits. Admin-only, and
// the script is built here from the posted headline/description - the same
// way the ad's captions are - plus the company's own closing line.
export async function POST(request: Request) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "brochures")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  if (isRateLimited(`ad-voice:${admin.id}`, 60_000, 12)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many voice requests. Please wait a minute." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = parseAdRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: "bad_request", message: parsed.error }, { status: 400 });
  const part = body?.part === "closing" ? "closing" : "description";

  const scripts = buildAdNarration({
    headline: parsed.ad.headline,
    description: parsed.ad.description,
    phones: [site.phoneDisplay, site.phoneDisplay2],
    langOverride: parsed.ad.lang,
  });

  const speech = await synthesizeSpeech(scripts[part], scripts.lang);
  if (!speech.ok) {
    return NextResponse.json(
      { error: speech.reason === "not_configured" ? "voice_not_configured" : "voice_failed", message: speech.message },
      { status: speech.reason === "not_configured" ? 501 : 502 }
    );
  }

  return new NextResponse(speech.audio, {
    headers: { "Content-Type": speech.contentType, "Cache-Control": "no-store" },
  });
}
