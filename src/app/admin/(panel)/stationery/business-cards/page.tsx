import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BusinessCardMaker } from "@/components/admin/stationery/BusinessCardMaker";
import { generateQrCodeDataUrl } from "@/lib/qrcode";
import { site } from "@/lib/site";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function BusinessCardsPage() {
  await requireSection("brochures");
  const [qrWebsite, qrWhatsapp] = await Promise.all([generateQrCodeDataUrl(site.websiteUrl), generateQrCodeDataUrl(site.whatsappHref)]);
  return (
    <div>
      <Link href="/admin/stationery" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Business Cards</h1>
      <p className="mt-1 text-sm text-muted">Fill in the details; the cards on the right are exactly what prints. Add more people for the team.</p>
      <div className="mt-6">
        <BusinessCardMaker qrWebsite={qrWebsite} qrWhatsapp={qrWhatsapp} />
      </div>
    </div>
  );
}
