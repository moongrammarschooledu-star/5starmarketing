import { NextResponse } from "next/server";
import { propertyValuationService } from "@/services/propertyValuationService";
import { marketDataService } from "@/services/marketDataService";
import { profileService } from "@/services/profileService";
import { canAccess, canManageFinance } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";

async function requireExportAccess() {
  const admin = await profileService.getCurrentAdmin();
  return !!admin && canAccess(admin.role, "investment") && canManageFinance(admin.role);
}

export async function GET(request: Request) {
  if (!(await requireExportAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "valuations";

  let csv = "";
  try {
    if (type === "valuations") {
      const valuations = await propertyValuationService.listRecent(5000);
      csv = toCsv(
        ["Property", "Method", "Base Price", "Area", "Area Unit", "Final Estimated Value", "Confidence", "Version", "Valuation Date"],
        valuations.map((v) => [v.propertyTitle ?? "", v.valuationMethod, v.basePrice, v.area, v.areaUnit, v.finalEstimatedValue, v.confidenceScore, v.version, v.valuationDate])
      );
    } else if (type === "market-data") {
      const records = await marketDataService.list();
      csv = toCsv(
        ["Location", "Property Type", "Average Price", "Price/Marla", "Price/Sqft", "Rental Yield", "Appreciation Rate", "Data Source", "Data Date", "Status"],
        records.map((r) => [r.location, r.propertyType ?? "", r.averagePrice ?? "", r.pricePerMarla ?? "", r.pricePerSqft ?? "", r.rentalYield ?? "", r.appreciationRate ?? "", r.dataSource ?? "", r.dataDate, r.status])
      );
    } else {
      return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
    }
  } catch (e) {
    console.error("investment/export failed:", e);
    return NextResponse.json({ error: "Could not export this report." }, { status: 500 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}.csv"`,
    },
  });
}
