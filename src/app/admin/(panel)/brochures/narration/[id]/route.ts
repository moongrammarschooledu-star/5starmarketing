import { NextResponse } from "next/server";
import { brochureService } from "@/services/brochureService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { site } from "@/lib/site";
import { buildNarration, synthesizeSpeech, type NarrationLang } from "@/lib/narration";

// POST (not GET): each call can cost text-to-speech credits, so it must not
// be triggerable by a cross-site image/link. The script is rebuilt here from
// the saved property data - the request only picks which part and language.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "brochures")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { part?: string; lang?: string } | null;
  const part = body?.part === "closing" ? "closing" : "description";
  const langOverride: NarrationLang | undefined = body?.lang === "en" || body?.lang === "ur" ? body.lang : undefined;

  const { id } = await params;
  let data: Awaited<ReturnType<typeof brochureService.buildRenderData>>;
  try {
    data = await brochureService.buildRenderData(id);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load this brochure." }, { status: 404 });
  }

  const t = data.target as { name: string; location: string; price?: string; description: string };
  const scripts = buildNarration({
    name: t.name,
    location: t.location,
    price: t.price,
    description: t.description,
    phones: [data.business.phone, site.phoneDisplay2],
    langOverride,
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
