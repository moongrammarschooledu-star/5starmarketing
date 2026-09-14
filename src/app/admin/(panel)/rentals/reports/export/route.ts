import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leaseService } from "@/services/leaseService";
import { tenantService } from "@/services/tenantService";
import { landlordService } from "@/services/landlordService";
import { depositService } from "@/services/depositService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";

async function requireExportAccess() {
  const admin = await profileService.getCurrentAdmin();
  return !!admin && canAccess(admin.role, "rentals");
}

export async function GET(request: Request) {
  if (!(await requireExportAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "rent-collection";
  const supabase = await createClient();

  let csv = "";
  try {
    if (type === "rent-collection" || type === "outstanding") {
      let query = supabase
        .from("rent_schedules")
        .select("invoice_number, due_date, total_due, status, leases(lease_number, tenants(name), rental_properties(properties(title)))")
        .order("due_date", { ascending: true });
      if (type === "outstanding") query = query.not("status", "in", "(PAID,WAIVED,CANCELLED)");
      const { data } = await query;
      csv = toCsv(
        ["Invoice #", "Lease", "Tenant", "Property", "Due Date", "Total Due", "Status"],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((data ?? []) as any[]).map((r) => [r.invoice_number, r.leases?.lease_number ?? "", r.leases?.tenants?.name ?? "", r.leases?.rental_properties?.properties?.title ?? "", r.due_date, Number(r.total_due), r.status])
      );
    } else if (type === "lease-expiry") {
      const leases = await leaseService.list();
      csv = toCsv(
        ["Lease #", "Property", "Tenant", "Landlord", "Start Date", "End Date", "Status"],
        leases.map((l) => [l.leaseNumber, l.propertyTitle ?? "", l.tenantName ?? "", l.landlordName ?? "", l.startDate, l.endDate, l.status])
      );
    } else if (type === "tenants") {
      const tenants = await tenantService.list();
      csv = toCsv(
        ["Name", "Phone", "Email", "Current Property", "Status"],
        tenants.map((t) => [t.name, t.phone ?? "", t.email ?? "", t.currentPropertyTitle ?? "", t.status])
      );
    } else if (type === "landlords") {
      const landlords = await landlordService.list();
      csv = toCsv(
        ["Name", "Phone", "Email", "Management Fee", "Status"],
        landlords.map((l) => [l.name, l.phone ?? "", l.email ?? "", l.managementFeeType === "NONE" ? "" : `${l.managementFeeValue}${l.managementFeeType === "PERCENTAGE" ? "%" : ""}`, l.status])
      );
    } else if (type === "deposits") {
      const deposits = await depositService.list();
      csv = toCsv(
        ["Lease #", "Tenant", "Property", "Amount", "Refund Amount", "Status"],
        deposits.map((d) => [d.leaseNumber ?? "", d.tenantName ?? "", d.propertyTitle ?? "", d.amount, d.refundAmount ?? "", d.status])
      );
    } else {
      return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
    }
  } catch (e) {
    console.error("rentals report export failed:", e);
    return NextResponse.json({ error: "Could not export this report." }, { status: 500 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rentals-${type}.csv"`,
    },
  });
}
