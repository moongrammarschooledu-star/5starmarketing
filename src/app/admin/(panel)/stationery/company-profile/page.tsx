import { StationeryShell } from "@/components/admin/stationery/StationeryShell";
import { CompanyProfileMaker } from "@/components/admin/stationery/CompanyProfileMaker";
import { generateQrCodeDataUrl } from "@/lib/qrcode";
import { site } from "@/lib/site";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function CompanyProfilePage() {
  await requireSection("brochures");
  const qrWebsite = await generateQrCodeDataUrl(site.websiteUrl);
  return (
    <StationeryShell title="Company Profile Brochure" help="A two-page A4 brochure about the company: who we are, our services and how to reach us. Edit the text on the left, then print or save as PDF.">
      <CompanyProfileMaker qrWebsite={qrWebsite} />
    </StationeryShell>
  );
}
