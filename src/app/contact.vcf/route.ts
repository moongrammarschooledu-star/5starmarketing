import { site } from "@/lib/site";
import { buildVcard } from "@/lib/vcard";

// The company's contact card. A customer who taps this link gets "5STAR.M
// Estate & Builders" saved in their phone - and people who have a business's
// number saved are the ones who can see its WhatsApp Status. Built once at
// deploy time, so it costs nothing per visit.
export const dynamic = "force-static";

export function GET() {
  const body = buildVcard([
    {
      name: site.fullName,
      org: site.fullName,
      phones: [site.phoneHref2],
      email: site.displayEmail,
      url: site.url,
      address: site.address,
      note: `${site.tagline} - ${site.taglineSecondary}`,
    },
  ]);
  return new Response(body, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'inline; filename="5STAR-M-Estate-Builders.vcf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
