import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TokenReceiptForm } from "@/components/admin/rentals/TokenReceiptForm";
import { agreementPrefillService } from "@/services/agreementPrefillService";
import { propertyService } from "@/services/propertyService";
import { profileService } from "@/services/profileService";
import { normalizeTokenData } from "@/lib/tokenReceipt/types";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined): string | undefined {
  return (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 60) || undefined;
}

export default async function NewTokenReceiptPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSection("rentals");
  const sp = await searchParams;
  // Opened from a property: its details and owner are already filled in.
  const propertyId = one(sp.property);
  const purpose = one(sp.purpose) === "sale" ? "sale" : "rent";
  const [fromProperty, properties, admin, forSale] = await Promise.all([
    propertyId ? agreementPrefillService.fromProperty(propertyId).catch(() => undefined) : undefined,
    propertyService.list().catch(() => []),
    profileService.getCurrentAdmin(),
    propertyId && purpose === "sale" ? agreementPrefillService.saleFromProperty(propertyId).catch(() => undefined) : undefined,
  ]);
  const prop = fromProperty?.property;
  const initial = normalizeTokenData(
    fromProperty && prop
      ? {
          ownerName: fromProperty.owner?.name ?? "",
          property: { description: prop.description, descriptionUr: "", area: prop.area, areaUr: "", city: prop.city, cityUr: "", size: prop.size, sizeUr: "" },
          // the monthly rent for a rent token, the asking price for a sale bayana
          agreedAmount: purpose === "sale" ? (forSale?.totalPrice ?? 0) : (fromProperty.monthlyRent ?? 0),
        }
      : {}
  );
  initial.purpose = purpose;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/rentals/tokens" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Token Receipts
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">New Token Receipt</h1>
      <p className="mt-1 text-sm text-muted">Fill in who paid, for which property and how much. Then print it, save it as PDF, or send it on WhatsApp.</p>
      <div className="mt-6">
        <TokenReceiptForm initial={initial} propertyId={propertyId} properties={properties.map((p) => ({ id: p.id, title: p.title }))} defaultReceivedBy={admin?.name ?? ""} />
      </div>
    </div>
  );
}
