import { NextResponse } from "next/server";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { detectNarrationLang, synthesizeSpeech, type NarrationLang } from "@/lib/narration";
import { isRateLimited } from "@/lib/rateLimit";

const MAX_CHARS = 700;

// POST (not GET): every call can cost text-to-speech credits. Admin-only and
// rate limited. Reads exactly the text it is given (the voice-over for a video
// the admin is editing) in a female or male voice.
export async function POST(request: Request) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "brochures")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  if (isRateLimited(`ad-speak:${admin.id}`, 60_000, 10)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many voice requests. Please wait a minute." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_CHARS) : "";
  if (text.length < 3) {
    return NextResponse.json({ error: "bad_request", message: "Please write the words for the voice." }, { status: 400 });
  }
  const lang: NarrationLang = body?.lang === "en" || body?.lang === "ur" ? body.lang : detectNarrationLang(text);
  const gender = body?.gender === "male" ? "male" : "female";

  const speech = await synthesizeSpeech(text, lang, gender);
  if (!speech.ok) {
    return NextResponse.json(
      { error: speech.reason === "not_configured" ? "voice_not_configured" : "voice_failed", message: speech.message },
      { status: speech.reason === "not_configured" ? 501 : 502 },
    );
  }

  return new NextResponse(speech.audio, {
    headers: { "Content-Type": speech.contentType, "Cache-Control": "no-store" },
  });
}
