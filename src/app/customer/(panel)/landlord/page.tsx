import Link from "next/link";
import { customerService } from "@/services/customerService";
import { landlordService } from "@/services/landlordService";
import { rentalPropertyService } from "@/services/rentalPropertyService";
import { leaseService } from "@/services/leaseService";
import { landlordStatementService } from "@/services/landlordStatementService";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";
import { LandlordMaintenanceApprovalList } from "@/components/customer/rentals/LandlordMaintenanceApprovalList";

export const metadata = { title: "Landlord Portal" };
export const dynamic = "force-dynamic";

export default async function CustomerLandlordPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const landlord = await landlordService.getByCustomerId(customer.id);
  if (!landlord) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">Landlord Portal</h1>
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm text-muted">You are not currently registered as a landlord.</p>
        </div>
      </div>
    );
  }

  const [rentalProperties, leases, statements] = await Promise.all([
    rentalPropertyService.listForLandlord(landlord.id),
    leaseService.list({ landlordId: landlord.id }),
    landlordStatementService.listForLandlord(landlord.id, true),
  ]);

  const propertyIds = rentalProperties.map((rp) => rp.propertyId);
  const supabase = await createClient();
  const { data: pendingApprovals } = propertyIds.length > 0
    ? await supabase
        .from("maintenance_work_orders")
        .select("id, work_order_number, description, estimated_cost, properties(title)")
        .in("property_id", propertyIds)
        .eq("landlord_approval_status", "PENDING")
    : { data: [] };

  const activeLeases = leases.filter((l) => l.status === "ACTIVE" || l.status === "EXPIRING");
  const totalMonthlyRent = activeLeases.reduce((sum, l) => sum + l.monthlyRent, 0);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Landlord Portal</h1>
      <p className="mt-1 text-sm text-muted">Welcome, {landlord.name}.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Properties" value={String(rentalProperties.length)} />
        <Metric label="Active Leases" value={String(activeLeases.length)} />
        <Metric label="Total Monthly Rent" value={formatPKR(totalMonthlyRent)} />
        <Metric label="Pending Approvals" value={String(pendingApprovals?.length ?? 0)} accent={(pendingApprovals?.length ?? 0) > 0} />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">My Properties</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rentalProperties.map((rp) => (
            <div key={rp.id} className="rounded-xl border border-border bg-surface p-3.5">
              <p className="text-sm font-semibold text-ink">
                {rp.propertyTitle} {rp.unitNumber ? `— ${rp.unitNumber}` : ""}
              </p>
              <p className="text-xs text-muted">{rp.monthlyRent != null ? formatPKR(rp.monthlyRent) : "—"}</p>
              <StatusBadge status={rp.rentalStatus} />
            </div>
          ))}
          {rentalProperties.length === 0 && <p className="text-sm text-muted">No properties yet.</p>}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Active Leases</h2>
        <div className="mt-3 space-y-2">
          {activeLeases.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3.5">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {l.propertyTitle} — {l.tenantName}
                </p>
                <p className="text-xs text-muted">
                  {new Date(l.startDate).toLocaleDateString("en-GB")} – {new Date(l.endDate).toLocaleDateString("en-GB")}
                </p>
              </div>
              <p className="text-sm font-bold text-ink">{formatPKR(l.monthlyRent)}/mo</p>
            </div>
          ))}
          {activeLeases.length === 0 && <p className="text-sm text-muted">No active leases.</p>}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Maintenance Approvals Needed</h2>
        <LandlordMaintenanceApprovalList
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items={(pendingApprovals ?? []).map((p: any) => ({ id: p.id, workOrderNumber: p.work_order_number, description: p.description, estimatedCost: p.estimated_cost != null ? Number(p.estimated_cost) : undefined, propertyTitle: p.properties?.title }))}
        />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Statements</h2>
        <div className="mt-3 space-y-2">
          {statements.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink">{s.statementNumber}</p>
                <p className="text-xs text-muted">
                  {new Date(s.periodStart).toLocaleDateString("en-GB")} – {new Date(s.periodEnd).toLocaleDateString("en-GB")}
                </p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
                <span>Rent Collected: {formatPKR(s.rentCollected)}</span>
                <span>Maintenance: -{formatPKR(s.maintenanceExpenses)}</span>
                <span>Management Fee: -{formatPKR(s.managementFees)}</span>
                <span className="font-bold text-ink">Net: {formatPKR(s.netAmount)}</span>
              </div>
            </div>
          ))}
          {statements.length === 0 && <p className="text-sm text-muted">No finalized statements yet.</p>}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">
          Have a question?{" "}
          <Link href="/customer/messages" className="font-bold text-primary hover:underline">
            Send us a message
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-base font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}
