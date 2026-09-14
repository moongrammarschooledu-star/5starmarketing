import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RentalDashboardStats, OccupancySummary, RentCollectionRate, PropertyRentalPerformance, RentalProfitability, LeaseStatus } from "@/lib/models/rental";
import type { CountBucket } from "@/lib/models/analytics";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const rentalReportService = {
  async dashboardStats(): Promise<RentalDashboardStats> {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 8) + "01";
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const { data: rentalProps } = await supabase.from("rental_properties").select("property_id, rental_status");
    const rentalPropertyIds = Array.from(new Set((rentalProps ?? []).map((r) => r.property_id)));

    const [{ data: leases }, { count: expiringCount }, { data: schedules }, { data: deposits }, { count: maintenanceCount }, { data: monthlyPayments }, { data: monthlyExpenses }] = await Promise.all([
      supabase.from("leases").select("status").eq("status", "ACTIVE"),
      supabase.from("leases").select("id", { count: "exact", head: true }).in("status", ["ACTIVE", "EXPIRING"]).lte("end_date", in30Days.toISOString().slice(0, 10)),
      supabase.from("rent_schedules").select("status, total_due, due_date"),
      supabase.from("security_deposits").select("amount").in("status", ["RECEIVED", "HELD", "PARTIALLY_REFUNDED"]),
      rentalPropertyIds.length > 0
        ? supabase.from("maintenance_requests").select("id", { count: "exact", head: true }).in("property_id", rentalPropertyIds).not("status", "in", "(CLOSED,CANCELLED,REJECTED)")
        : Promise.resolve({ count: 0 }),
      supabase.from("rent_payments").select("amount").eq("status", "CONFIRMED").gte("payment_date", monthStart),
      supabase.from("expenses").select("amount, property_id").in("status", ["APPROVED", "PAID"]).gte("expense_date", monthStart),
    ]);

    const totalRentalProperties = rentalProps?.length ?? 0;
    const occupiedUnits = (rentalProps ?? []).filter((r) => r.rental_status === "OCCUPIED").length;
    const vacantUnits = (rentalProps ?? []).filter((r) => r.rental_status === "VACANT" || r.rental_status === "AVAILABLE").length;

    const rentDue = (schedules ?? []).filter((s) => s.status === "DUE" || s.status === "PARTIALLY_PAID").reduce((sum, s) => sum + Number(s.total_due), 0);
    const overdueRent = (schedules ?? []).filter((s) => s.status === "OVERDUE").reduce((sum, s) => sum + Number(s.total_due), 0);
    const rentCollected = (monthlyPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    const outstandingRent = (schedules ?? []).filter((s) => !["PAID", "WAIVED", "CANCELLED"].includes(s.status)).reduce((sum, s) => sum + Number(s.total_due), 0);
    const securityDepositsHeld = (deposits ?? []).reduce((sum, d) => sum + Number(d.amount), 0);

    const rentalPropIdSet = new Set(rentalPropertyIds);
    const monthlyRentalExpenses = (monthlyExpenses ?? []).filter((e) => e.property_id && rentalPropIdSet.has(e.property_id)).reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      totalRentalProperties,
      occupiedUnits,
      vacantUnits,
      activeLeases: leases?.length ?? 0,
      expiringLeases: expiringCount ?? 0,
      rentDue: round2(rentDue),
      rentCollected: round2(rentCollected),
      outstandingRent: round2(outstandingRent),
      overdueRent: round2(overdueRent),
      securityDepositsHeld: round2(securityDepositsHeld),
      openMaintenanceRequests: maintenanceCount ?? 0,
      monthlyRentalIncome: round2(rentCollected),
      monthlyRentalExpenses: round2(monthlyRentalExpenses),
      netRentalIncome: round2(rentCollected - monthlyRentalExpenses),
    };
  },

  /** Section 33 — handles zero rentable units safely (null, never a
   *  divide-by-zero or a fabricated 0%/100%). */
  async occupancySummary(): Promise<OccupancySummary> {
    const supabase = await createClient();
    const { data } = await supabase.from("rental_properties").select("rental_status");
    const rows = data ?? [];
    const totalUnits = rows.length;
    const occupied = rows.filter((r) => r.rental_status === "OCCUPIED").length;
    const vacant = rows.filter((r) => r.rental_status === "VACANT" || r.rental_status === "AVAILABLE").length;
    const unavailable = totalUnits - occupied - vacant;
    return { totalUnits, occupied, vacant, unavailable, occupancyRatePercent: totalUnits > 0 ? round2((occupied / totalUnits) * 100) : null };
  },

  /** Section 34 — excludes CANCELLED/WAIVED rent periods from the
   *  denominator per the spec's own configurable-exclusion instruction. */
  async rentCollectionRate(periodFrom: string, periodTo: string): Promise<RentCollectionRate> {
    const supabase = await createClient();
    const [{ data: schedules }, { data: payments }] = await Promise.all([
      supabase.from("rent_schedules").select("total_due, status").gte("due_date", periodFrom).lte("due_date", periodTo).not("status", "in", "(CANCELLED,WAIVED)"),
      supabase.from("rent_payments").select("amount").eq("status", "CONFIRMED").gte("payment_date", periodFrom).lte("payment_date", periodTo),
    ]);
    const totalDue = (schedules ?? []).reduce((sum, s) => sum + Number(s.total_due), 0);
    const confirmedCollected = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    return { totalDue: round2(totalDue), confirmedCollected: round2(confirmedCollected), collectionRatePercent: totalDue > 0 ? round2((confirmedCollected / totalDue) * 100) : null, periodFrom, periodTo };
  },

  async leaseExpiryBuckets(): Promise<CountBucket[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("leases").select("end_date").in("status", ["ACTIVE", "EXPIRING"]);
    const today = new Date();
    const buckets = { Expired: 0, "Expires today": 0, "Within 7 days": 0, "Within 30 days": 0, "Beyond 30 days": 0 };
    for (const l of data ?? []) {
      const end = new Date(l.end_date);
      const days = Math.floor((end.getTime() - today.getTime()) / 86400000);
      if (days < 0) buckets["Expired"]++;
      else if (days === 0) buckets["Expires today"]++;
      else if (days <= 7) buckets["Within 7 days"]++;
      else if (days <= 30) buckets["Within 30 days"]++;
      else buckets["Beyond 30 days"]++;
    }
    return Object.entries(buckets).map(([label, count]) => ({ label, count }));
  },

  async propertyPerformance(): Promise<PropertyRentalPerformance[]> {
    const supabase = await createClient();
    const { data: rentalProps } = await supabase.from("rental_properties").select("id, monthly_rent, properties(title)");
    if (!rentalProps || rentalProps.length === 0) return [];

    const ids = rentalProps.map((r) => r.id);
    const [{ data: leases }, { data: schedules }, { data: maintenanceCounts }] = await Promise.all([
      supabase.from("leases").select("rental_property_id, status, end_date, tenants(name)").in("rental_property_id", ids).in("status", ["ACTIVE", "EXPIRING"]),
      supabase.from("rent_schedules").select("total_due, status, lease_id, leases!inner(rental_property_id)").not("status", "in", "(PAID,WAIVED,CANCELLED)"),
      supabase.from("maintenance_work_orders").select("property_id").not("status", "in", "(CLOSED,CANCELLED)"),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leaseByProperty = new Map(((leases ?? []) as any[]).map((l) => [l.rental_property_id, l]));
    const outstandingByProperty = new Map<string, number>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of (schedules ?? []) as any[]) {
      const propId = s.leases?.rental_property_id;
      if (!propId) continue;
      outstandingByProperty.set(propId, (outstandingByProperty.get(propId) ?? 0) + Number(s.total_due));
    }
    const maintenanceByProperty = new Map<string, number>();
    for (const m of maintenanceCounts ?? []) {
      maintenanceByProperty.set(m.property_id, (maintenanceByProperty.get(m.property_id) ?? 0) + 1);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rentalProps as any[]).map((rp) => {
      const lease = leaseByProperty.get(rp.id);
      return {
        rentalPropertyId: rp.id,
        propertyTitle: rp.properties?.title ?? "Untitled",
        currentTenantName: lease?.tenants?.name ?? null,
        leaseStatus: (lease?.status as LeaseStatus) ?? null,
        monthlyRent: rp.monthly_rent != null ? Number(rp.monthly_rent) : null,
        outstandingAmount: round2(outstandingByProperty.get(rp.id) ?? 0),
        openMaintenanceRequests: maintenanceByProperty.get(rp.id) ?? 0,
        nextLeaseExpiry: lease?.end_date ?? null,
      };
    });
  },

  /** Section 32 — ACTUAL figures only from real payments/expenses; the
   *  estimated annual rent/yield are clearly separate, never blended
   *  into the actual net income. */
  async profitability(rentalPropertyId: string): Promise<RentalProfitability> {
    const supabase = await createClient();
    const { data: rentalProperty } = await supabase.from("rental_properties").select("property_id, monthly_rent, landlord_id, rental_status").eq("id", rentalPropertyId).maybeSingle();

    const [{ data: payments }, { data: expenses }, { data: accounts }] = await Promise.all([
      supabase.from("rent_payments").select("amount").eq("status", "CONFIRMED").eq("rental_property_id", rentalPropertyId),
      rentalProperty?.property_id ? supabase.from("expenses").select("amount, account_id").eq("property_id", rentalProperty.property_id).in("status", ["APPROVED", "PAID"]) : Promise.resolve({ data: [] }),
      supabase.from("accounts").select("id, account_code").in("account_code", ["5090", "5200"]),
    ]);

    const grossRentalIncomeActual = round2((payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0));
    const maintenanceAccountId = accounts?.find((a) => a.account_code === "5090")?.id;
    const maintenanceActual = round2((expenses ?? []).filter((e) => e.account_id === maintenanceAccountId).reduce((sum, e) => sum + Number(e.amount), 0));
    const propertyExpensesActual = round2((expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0));

    let managementFeesActual = 0;
    if (rentalProperty?.landlord_id) {
      const { data: landlord } = await supabase.from("landlords").select("management_fee_type, management_fee_value").eq("id", rentalProperty.landlord_id).maybeSingle();
      if (landlord?.management_fee_type === "PERCENTAGE") managementFeesActual = round2((grossRentalIncomeActual * Number(landlord.management_fee_value)) / 100);
      else if (landlord?.management_fee_type === "FIXED") managementFeesActual = Number(landlord.management_fee_value);
    }

    const occupancyRatePercent = rentalProperty ? (rentalProperty.rental_status === "OCCUPIED" ? 100 : 0) : null;
    const estimatedAnnualRent = rentalProperty?.monthly_rent != null ? round2(Number(rentalProperty.monthly_rent) * 12) : null;

    return {
      rentalPropertyId,
      grossRentalIncomeActual,
      propertyExpensesActual,
      managementFeesActual,
      maintenanceActual,
      netRentalIncomeActual: round2(grossRentalIncomeActual - propertyExpensesActual - managementFeesActual),
      occupancyRatePercent,
      estimatedAnnualRent,
      // Rental yield needs a real property value (STEP 24 valuations) —
      // never guessed; null when none exists yet.
      estimatedRentalYieldPercent: null,
    };
  },
};
