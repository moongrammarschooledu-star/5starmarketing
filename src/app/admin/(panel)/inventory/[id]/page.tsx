import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers, Handshake } from "lucide-react";
import { inventoryService } from "@/services/inventoryService";
import { teamService } from "@/services/teamService";
import { profileService } from "@/services/profileService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { InventoryStatusActionsPanel } from "@/components/admin/inventory/InventoryStatusActionsPanel";
import { InventoryPriceHistoryPanel } from "@/components/admin/inventory/InventoryPriceHistoryPanel";
import { InventoryStatusHistoryPanel } from "@/components/admin/inventory/InventoryStatusHistoryPanel";
import { InventoryNotesPanel } from "@/components/admin/inventory/InventoryNotesPanel";
import { DealActivityTimeline } from "@/components/admin/deals/DealActivityTimeline";
import { formatDateOnly } from "@/lib/date";
import { canManageDealFinancials } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("inventory");
  const { id } = await params;
  const unit = await inventoryService.getById(id);
  if (!unit) notFound();

  const [priceHistory, statusHistory, notes, activity, assignableAgents, admin] = await Promise.all([
    inventoryService.listPriceHistory(id),
    inventoryService.listStatusHistory(id),
    inventoryService.listNotes(id),
    inventoryService.listActivity(id),
    teamService.listAssignable(),
    profileService.getCurrentAdmin(),
  ]);
  const canManage = admin ? canManageDealFinancials(admin.role) : false;

  return (
    <div>
      <Link href="/admin/inventory" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Inventory
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{unit.unitNumber}</h1>
          <p className="mt-1 text-sm text-muted">{[unit.projectName ?? unit.propertyTitle, unit.building, unit.block, unit.floor && `Floor ${unit.floor}`].filter(Boolean).join(" · ") || "Standalone unit"}</p>
        </div>
        <StatusBadge status={unit.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
              <Layers className="h-4.5 w-4.5 text-primary" /> Unit Information
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Row label="Type" value={unit.unitType} />
              {unit.area && <Row label="Area" value={`${unit.area} ${unit.areaUnit ?? ""}`} />}
              {unit.bedrooms !== undefined && <Row label="Bedrooms" value={String(unit.bedrooms)} />}
              {unit.bathrooms !== undefined && <Row label="Bathrooms" value={String(unit.bathrooms)} />}
              {unit.facing && <Row label="Facing" value={unit.facing} />}
              {unit.orientation && <Row label="Orientation" value={unit.orientation} />}
              {unit.parking && <Row label="Parking" value={unit.parking} />}
              {unit.availabilityDate && <Row label="Availability Date" value={formatDateOnly(unit.availabilityDate)} />}
              {unit.reservedUntil && <Row label="Reserved Until" value={new Date(unit.reservedUntil).toLocaleString("en-GB")} />}
              {unit.agentName && <Row label="Agent" value={unit.agentName} />}
              {unit.customerName && <Row label="Customer" value={unit.customerName} />}
            </div>
            {unit.dealId && unit.dealNumber && (
              <Link href={`/admin/deals/${unit.dealId}`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                <Handshake className="h-3.5 w-3.5" /> View linked deal {unit.dealNumber}
              </Link>
            )}
          </div>

          <InventoryPriceHistoryPanel inventoryId={id} price={unit.price} history={priceHistory} canManage={canManage} />
          <InventoryStatusHistoryPanel history={statusHistory} />
          <InventoryNotesPanel inventoryId={id} notes={notes} />
          <DealActivityTimeline activity={activity} />
        </div>

        <div className="space-y-5">
          {!unit.dealId && (unit.status === "RESERVED" || unit.status === "BOOKED" || unit.status === "AVAILABLE") && (
            <Link
              href={`/admin/deals/new?inventory=${unit.id}`}
              className="flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white hover:bg-ink/90"
            >
              <Handshake className="h-4 w-4" /> Create Deal
            </Link>
          )}
          <InventoryStatusActionsPanel unit={unit} assignableAgents={assignableAgents} canManage={canManage} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}
