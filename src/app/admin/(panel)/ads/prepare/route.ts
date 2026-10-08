import { NextResponse } from "next/server";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { site } from "@/lib/site";
import { buildAdNarration } from "@/lib/narration";
import { parseAdRequest } from "@/lib/adMaker";
import { generateQrCodeDataUrl } from "@/lib/qrcode";

/** Everything the browser needs, besides the pictures themselves, to draw a
 *  company ad video: the company/contact details, a QR code of the website and
 *  the spoken script built from the text the admin wrote. */
export async function POST(request: Request) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "brochures")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const parsed = parseAdRequest(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const ad = parsed.ad;

  const phones = [site.phoneDisplay, site.phoneDisplay2];
  const narration = buildAdNarration({ headline: ad.headline, description: ad.description, phones, langOverride: ad.lang });

  let qr = "";
  try {
    qr = await generateQrCodeDataUrl(site.websiteUrl);
  } catch {
    qr = "";
  }

  return NextResponse.json({
    slug: "ad",
    title: ad.headline,
    location: ad.subline,
    badge: ad.badge,
    demand: ad.highlight,
    highlightLabel: "OFFER",
    facts: [],
    features: [],
    images: [],
    companyName: site.fullName,
    about: site.description,
    tagline: `${site.tagline} - ${site.taglineSecondary}`,
    director: `${site.directorTitle}: ${site.director}`,
    services: ["Buying & Selling", "Development", "Construction", "Rental Services"],
    phones,
    email: site.displayEmail,
    website: site.websiteUrl.replace(/^https?:\/\//, ""),
    qr,
    // What is spoken (headline + the description as written); the video's
    // captions show the same text.
    narration,
  });
}
