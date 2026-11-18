import { StationeryShell } from "@/components/admin/stationery/StationeryShell";
import { FlexMaker, type FlexProperty } from "@/components/admin/stationery/FlexMaker";
import { generateQrCodeDataUrl } from "@/lib/qrcode";
import { propertyService } from "@/services/propertyService";
import { site } from "@/lib/site";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function FlexPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSection("brochures");
  const sp = await searchParams;
  const raw = sp.property;
  const initialPropertyId = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 60) || undefined;

  const [qrWebsite, qrWhatsapp, properties] = await Promise.all([
    generateQrCodeDataUrl(site.websiteUrl),
    generateQrCodeDataUrl(site.whatsappHref),
    propertyService.list().catch(() => []),
  ]);
  const flexProperties: FlexProperty[] = properties.map((p) => ({
    id: p.id,
    title: p.title,
    purpose: p.purpose,
    type: p.type,
    location: p.location,
    city: p.city,
    size: p.size,
    price: p.price,
    images: p.images ?? [],
    features: p.features ?? [],
    serialNo: p.serialNo,
  }));

  return (
    <StationeryShell title="Flex Banner Design" help="Design a flex for the company (office / shop) or for one property. Choose the flex size, fill in or pick a property, then save the PDF at the exact flex size for the flex printer.">
      <FlexMaker properties={flexProperties} qrWebsite={qrWebsite} qrWhatsapp={qrWhatsapp} initialPropertyId={initialPropertyId} />
    </StationeryShell>
  );
}
