import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { maintenanceAssetService } from "@/services/maintenanceAssetService";
import { profileService } from "@/services/profileService";
import { canManageMaintenance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { formatPKR } from "@/lib/calculator";
import { AddWarrantyForm } from "@/components/admin/maintenance/AddWarrantyForm";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("maintenance");
  const { id } = await params;
  const [asset, warranties, history, admin] = await Promise.all([
    maintenanceAssetService.getById(id),
    maintenanceAssetService.listWarranties(id),
    maintenanceAssetService.listHistory(id),
    profileService.getCurrentAdmin(),
  ]);
  if (!asset) notFound();
  const canManage = admin ? canManageMaintenance(admin.role) : false;

  return (
    <div>
      <Link href="/admin/maintenance/assets" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Assets
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">{asset.assetNumber}</h1>
      <p className="mt-1 text-sm text-muted">
        {asset.category} · {asset.propertyTitle ?? "No property"} {asset.location ? `· ${asset.location}` : ""}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Condition" value={asset.condition.replace(/_/g, " ")} />
        <Metric label="Status" value={asset.status.replace(/_/g, " ")} />
        <Metric label="Manufacturer" value={asset.manufacturer ?? "—"} />
        <Metric label="Model" value={asset.model ?? "—"} />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Warranties</h2>
        <div className="mt-3 space-y-2">
          {warranties.map((w) => (
            <div key={w.id} className="rounded-xl border border-border bg-surface p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{w.provider ?? "Provider not specified"}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${new Date(w.expiryDate) > new Date() ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>Expires {new Date(w.expiryDate).toLocaleDateString("en-GB")}</span>
              </div>
              {w.coverageDescription && <p className="mt-1 text-xs text-muted">{w.coverageDescription}</p>}
              {(w.contactName || w.contactPhone) && (
                <p className="mt-1 text-xs text-muted">
                  {w.contactName} {w.contactPhone ? `· ${w.contactPhone}` : ""}
                </p>
              )}
            </div>
          ))}
          {warranties.length === 0 && <p className="text-sm text-muted">No warranties on record.</p>}
        </div>
        {canManage && (
          <div className="mt-4">
            <AddWarrantyForm assetId={asset.id} />
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Service History</h2>
        <p className="mt-1 text-xs text-muted">Every real inspection, maintenance and repair event recorded against this asset.</p>
        <div className="mt-3 space-y-2">
          {history.map((h) => (
            <div key={h.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-3.5">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {h.eventType.replace(/_/g, " ")} — {new Date(h.eventDate).toLocaleDateString("en-GB")}
                </p>
                {h.description && <p className="mt-0.5 text-xs text-muted">{h.description}</p>}
                {h.vendorName && <p className="mt-0.5 text-xs text-muted">Vendor: {h.vendorName}</p>}
                {h.workOrderNumber && <p className="mt-0.5 text-xs text-muted">Work Order: {h.workOrderNumber}</p>}
              </div>
              {h.cost != null && <span className="shrink-0 text-sm font-bold text-ink">{formatPKR(h.cost)}</span>}
            </div>
          ))}
          {history.length === 0 && <p className="text-sm text-muted">No service history recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-base font-extrabold text-ink">{value}</p>
    </div>
  );
}
