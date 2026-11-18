import { StationeryShell } from "@/components/admin/stationery/StationeryShell";
import { SignboardMaker } from "@/components/admin/stationery/SignboardMaker";
import { generateQrCodeDataUrl } from "@/lib/qrcode";
import { site } from "@/lib/site";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function SignboardPage() {
  await requireSection("brochures");
  const [qrWebsite, qrWhatsapp] = await Promise.all([generateQrCodeDataUrl(site.websiteUrl), generateQrCodeDataUrl(site.whatsappHref)]);
  return (
    <StationeryShell title="Property Signboard" help="A big FOR SALE / FOR RENT poster with the details, a huge phone number and a QR code, to stick on the property.">
      <SignboardMaker qrWebsite={qrWebsite} qrWhatsapp={qrWhatsapp} />
    </StationeryShell>
  );
}
