import { NextResponse, type NextRequest } from "next/server";
import { site, whatsappLink } from "@/lib/site";
import { analyticsService } from "@/services/analyticsService";
import { marketingAnalyticsService } from "@/services/marketingAnalyticsService";

// A short link that opens a WhatsApp chat with the company, and counts the tap.
// Social posts (TikTok, Instagram...) cannot hold a clickable WhatsApp link, but a
// short address like 5starmestate.com/wa/S-000051 is easy to type, and the same link
// works as the "link in bio" (5starmestate.com/wa?src=tiktok).
//   /wa                    -> general chat
//   /wa/S-000051           -> chat that already names the property reference
//   ?src=tiktok            -> where the person came from (shown in Marketing sources)
export const dynamic = "force-dynamic";

const BOTS = /bot|crawl|spider|preview|facebookexternalhit|slurp|headless/i;

export async function GET(request: NextRequest, { params }: { params: Promise<{ ref?: string[] }> }) {
  const { ref: refParts } = await params;
  const rawRef = refParts?.[0] ?? "";
  const ref = /^[A-Za-z0-9-]{3,24}$/.test(rawRef) ? rawRef.toUpperCase() : "";
  const rawSrc = request.nextUrl.searchParams.get("src") ?? "";
  const src = /^[a-z0-9_-]{2,30}$/i.test(rawSrc) ? rawSrc.toLowerCase() : "social";

  const message = ref
    ? `Hi 5STAR.M, I saw your ${src === "social" ? "post" : `${src} post`} for property Ref: ${ref}. Please share the details.`
    : `Hi 5STAR.M, I saw your ${src === "social" ? "post" : `${src} post`}. Please share more details.`;

  // People tapping the link are counted; link-preview robots are not.
  if (!BOTS.test(request.headers.get("user-agent") ?? "")) {
    await Promise.all([
      analyticsService.recordEvent("whatsapp_click", {}),
      marketingAnalyticsService.recordEvent("whatsapp_click", {
        landingPage: `/wa${ref ? `/${ref}` : ""}`,
        utmSource: src,
        utmMedium: "social",
        utmContent: ref || undefined,
      }),
    ]);
  }

  const res = NextResponse.redirect(whatsappLink(message) || `${site.whatsappHref}`, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
