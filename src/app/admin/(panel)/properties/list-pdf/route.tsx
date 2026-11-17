import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { propertyService } from "@/services/propertyService";
import { ownerDetailsService } from "@/services/ownerDetailsService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { clean } from "@/lib/pdf/detailSheets";
import { PropertyListDocument, type PropertyListGroup, type PropertyListRow } from "@/lib/pdf/PropertyListDocument";
import type { Property } from "@/lib/models/property";

const GROUPS: { heading: string; match: (p: Property) => boolean; filter: "sale" | "rent" }[] = [
  { heading: "FOR SALE", match: (p) => p.purpose !== "For Rent", filter: "sale" },
  { heading: "FOR RENT", match: (p) => p.purpose === "For Rent", filter: "rent" },
];

/** A short list of properties (name, area, demand, size, owner contact) as a printable office-record PDF.
 *  ?purpose=all|sale|rent  &status=available|all */
export async function GET(request: Request) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "properties")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const purpose = url.searchParams.get("purpose");
  const which = purpose === "sale" || purpose === "rent" ? purpose : "all";
  const availableOnly = url.searchParams.get("status") !== "all";

  const properties = (await propertyService.list()).filter((p) => !availableOnly || p.status === "Available");
  const owners = await ownerDetailsService.listForProperties().catch(() => ({}) as Awaited<ReturnType<typeof ownerDetailsService.listForProperties>>);

  const toRow = (p: Property): PropertyListRow => {
    const o = owners[p.id];
    const phones = [...new Set([o?.phone, o?.altPhone].map((x) => (x ?? "").trim()).filter(Boolean))].join(" / ");
    return {
      serialNo: p.serialNo ?? "",
      title: clean(p.title.replace(/\s+/g, " ").replace(/ ,/g, ",")),
      area: clean(p.location.replace(/\s+/g, " ").replace(/ ,/g, ",")),
      demand: clean(p.price),
      size: clean(p.size),
      ownerName: clean(o?.name ?? ""),
      ownerPhones: clean(phones),
    };
  };

  const groups: PropertyListGroup[] = GROUPS.filter((g) => which === "all" || g.filter === which)
    .map((g) => ({
      heading: g.heading,
      rows: properties
        .filter(g.match)
        .sort((a, b) => (a.serialNo ?? "").localeCompare(b.serialNo ?? ""))
        .map(toRow),
    }))
    .filter((g) => g.rows.length > 0);

  const total = groups.reduce((s, g) => s + g.rows.length, 0);
  const subtitle = `${which === "all" ? "Sale and rent" : which === "sale" ? "For sale" : "For rent"}  |  ${availableOnly ? "Available only" : "All statuses"}  |  ${total} properties`;
  const printedOn = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" });

  const buffer = await renderToBuffer(<PropertyListDocument groups={groups} subtitle={subtitle} printedOn={printedOn} printedBy={admin.name ?? "Admin"} />);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="properties-short-list-${which}-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
