import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TokenReceiptForm } from "@/components/admin/rentals/TokenReceiptForm";
import { tokenReceiptService } from "@/services/tokenReceiptService";
import { propertyService } from "@/services/propertyService";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function TokenReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("rentals");
  const { id } = await params;
  const [record, properties] = await Promise.all([tokenReceiptService.getById(id), propertyService.list().catch(() => [])]);
  if (!record) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/rentals/tokens" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Token Receipts
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Token Receipt {record.receiptNo}</h1>
      <p className="mt-1 text-sm text-muted">Change anything and press Save &amp; Print to get the corrected receipt. When the client is ready, make the rent agreement from here.</p>
      <div className="mt-6">
        <TokenReceiptForm id={record.id} receiptNo={record.receiptNo} initial={record.data} propertyId={record.propertyId} properties={properties.map((p) => ({ id: p.id, title: p.title }))} defaultReceivedBy="" />
      </div>
    </div>
  );
}
