import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { landlordService } from "@/services/landlordService";
import { landlordStatementService } from "@/services/landlordStatementService";
import { rentalPropertyService } from "@/services/rentalPropertyService";
import { profileService } from "@/services/profileService";
import { canManageRentals } from "@/lib/permissions";
import { LandlordStatementManager } from "@/components/admin/rentals/LandlordStatementManager";
import { formatPKR } from "@/lib/calculator";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function LandlordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("rentals");
  const { id } = await params;
  const [landlord, statements, rentalProperties, admin] = await Promise.all([
    landlordService.getById(id),
    landlordStatementService.listForLandlord(id),
    rentalPropertyService.listForLandlord(id),
    profileService.getCurrentAdmin(),
  ]);
  if (!landlord) notFound();
  const canManage = admin ? canManageRentals(admin.role) : false;

  return (
    <div>
      <Link href="/admin/rentals/landlords" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Landlords
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">{landlord.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {landlord.phone ?? "—"} · {landlord.email ?? "—"}
      </p>

      <div className="mt-6">
        <h2 className="font-heading text-lg font-bold text-ink">Properties</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rentalProperties.map((rp) => (
            <div key={rp.id} className="rounded-xl border border-border bg-surface p-3.5">
              <p className="text-sm font-semibold text-ink">
                {rp.propertyTitle} {rp.unitNumber ? `— ${rp.unitNumber}` : ""}
              </p>
              <p className="text-xs text-muted">{rp.monthlyRent != null ? formatPKR(rp.monthlyRent) : "—"} · {rp.rentalStatus}</p>
            </div>
          ))}
          {rentalProperties.length === 0 && <p className="text-sm text-muted">No properties assigned yet.</p>}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Statements</h2>
        <LandlordStatementManager landlordId={id} statements={statements} canManage={canManage} />
      </div>
    </div>
  );
}
