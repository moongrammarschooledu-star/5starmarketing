import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RentAgreementForm } from "@/components/admin/rentals/RentAgreementForm";
import { agreementPrefillService } from "@/services/agreementPrefillService";
import { propertyService } from "@/services/propertyService";
import { normalizeAgreementData } from "@/lib/rentAgreement/types";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined): string | undefined {
  return (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 60) || undefined;
}

export default async function NewRentAgreementPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSection("rentals");
  const sp = await searchParams;
  // Opened from a lease or a property: that record's details are already filled in.
  const leaseId = one(sp.lease);
  const propertyId = one(sp.property);
  const tokenId = one(sp.token);

  const [fromToken, fromLease, fromProperty, properties] = await Promise.all([
    tokenId ? agreementPrefillService.fromToken(tokenId).catch(() => undefined) : undefined,
    leaseId ? agreementPrefillService.fromLease(leaseId).catch(() => undefined) : undefined,
    !leaseId && !tokenId && propertyId ? agreementPrefillService.fromProperty(propertyId).catch(() => undefined) : undefined,
    propertyService.list().catch(() => []),
  ]);
  const initial = normalizeAgreementData(fromToken ?? fromLease ?? fromProperty ?? {});

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/rentals/agreements" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Rent Agreements
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">New Rent Agreement</h1>
      <p className="mt-1 text-sm text-muted">
        Fill in the owner, tenant, property and rent. Write names and addresses in Urdu too if the agreement is in Urdu. Then download the PDF.
        {fromToken ? " The client, property, rent and the token are already filled in from the token receipt." : fromLease ? " The details of the lease are already filled in." : fromProperty ? " The property and its owner are already filled in." : ""}
      </p>
      <div className="mt-6">
        <RentAgreementForm initial={initial} links={{ leaseId, propertyId }} properties={properties.map((p) => ({ id: p.id, title: p.title }))} />
      </div>
    </div>
  );
}
