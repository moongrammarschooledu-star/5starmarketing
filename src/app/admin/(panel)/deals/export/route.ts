import { NextResponse } from "next/server";
import { dealService } from "@/services/dealService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { parseDealSearchParams } from "@/lib/dealSearchParams";
import { toCsv } from "@/lib/csv";

async function requireDealsAccess() {
  const admin = await profileService.getCurrentAdmin();
  return !!admin && canAccess(admin.role, "deals");
}

export async function GET(request: Request) {
  if (!(await requireDealsAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const filters = parseDealSearchParams(sp);

  let csv = "";
  try {
    const deals = await dealService.searchAll(filters);
    csv = toCsv(
      ["Deal Number", "Customer", "Property", "Agent", "Status", "Deal Value", "Received", "Outstanding", "Created Date"],
      deals.map((d) => [d.dealNumber, d.customerName ?? "", d.propertyTitle ?? d.projectName ?? "", d.agentName ?? "", d.status, d.finalAmount, d.receivedAmount, d.outstandingAmount, d.createdAt.slice(0, 10)])
    );
  } catch (e) {
    console.error("deals/export failed:", e);
    return NextResponse.json({ error: "Could not export deals." }, { status: 500 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="deals.csv"`,
    },
  });
}
