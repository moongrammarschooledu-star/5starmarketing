import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RentAgreementForm } from "@/components/admin/rentals/RentAgreementForm";
import { rentAgreementService } from "@/services/rentAgreementService";
import { propertyService } from "@/services/propertyService";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function RentAgreementPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("rentals");
  const { id } = await params;
  const [record, properties] = await Promise.all([rentAgreementService.getById(id), propertyService.list().catch(() => [])]);
  if (!record) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/rentals/agreements" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Rent Agreements
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Rent Agreement {record.agreementNo}</h1>
      <p className="mt-1 text-sm text-muted">Change anything and press Save &amp; download PDF to get the corrected agreement.</p>
      <div className="mt-6">
        <RentAgreementForm
          id={record.id}
          agreementNo={record.agreementNo}
          initial={record.data}
          links={{ leaseId: record.leaseId, propertyId: record.propertyId }}
          properties={properties.map((p) => ({ id: p.id, title: p.title }))}
          documentId={record.documentId}
        />
      </div>
    </div>
  );
}
