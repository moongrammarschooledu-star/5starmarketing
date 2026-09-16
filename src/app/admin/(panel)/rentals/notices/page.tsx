import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { rentalNoticeService } from "@/services/rentalNoticeService";
import { leaseService } from "@/services/leaseService";
import { NoticeManager } from "@/components/admin/rentals/NoticeManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function RentalNoticesPage() {
  await requireSection("rentals");
  const [notices, leases] = await Promise.all([rentalNoticeService.list(), leaseService.list()]);

  return (
    <div>
      <Link href="/admin/rentals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Rentals
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Notices</h1>
      <NoticeManager notices={notices} leases={leases.map((l) => ({ id: l.id, label: `${l.leaseNumber} — ${l.tenantName}`, rentalPropertyId: l.rentalPropertyId }))} />
    </div>
  );
}
