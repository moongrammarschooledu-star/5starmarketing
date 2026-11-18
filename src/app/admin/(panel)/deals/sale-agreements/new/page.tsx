import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SaleAgreementForm } from "@/components/admin/deals/SaleAgreementForm";
import { agreementPrefillService } from "@/services/agreementPrefillService";
import { propertyService } from "@/services/propertyService";
import { normalizeSaleData } from "@/lib/saleAgreement/types";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined): string | undefined {
  return (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 60) || undefined;
}

export default async function NewSaleAgreementPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSection("deals");
  const sp = await searchParams;
  // Opened from a bayana receipt or a property: that record's details are already filled in.
  const tokenId = one(sp.token);
  const propertyId = one(sp.property);

  const [fromToken, fromProperty, properties] = await Promise.all([
    tokenId ? agreementPrefillService.saleFromToken(tokenId).catch(() => undefined) : undefined,
    !tokenId && propertyId ? agreementPrefillService.saleFromProperty(propertyId).catch(() => undefined) : undefined,
    propertyService.list().catch(() => []),
  ]);
  const initial = normalizeSaleData(fromToken ?? fromProperty ?? {});

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/deals/sale-agreements" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Sale Agreements
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">New Sale Agreement</h1>
      <p className="mt-1 text-sm text-muted">
        Fill in the seller, buyer, property, price and the advance. Write names and addresses in Urdu too if the agreement is in Urdu. Then print it.
        {fromToken ? " The buyer, property, price and the bayana are already filled in from the receipt." : fromProperty ? " The property and its owner are already filled in." : ""}
      </p>
      <div className="mt-6">
        <SaleAgreementForm initial={initial} propertyId={propertyId} properties={properties.map((p) => ({ id: p.id, title: p.title }))} />
      </div>
    </div>
  );
}
