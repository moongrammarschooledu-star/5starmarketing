import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { demandService } from "@/services/demandService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { clean } from "@/lib/pdf/detailSheets";
import { describeBudget, describeSize } from "@/lib/demandText";
import { TableListDocument, type TableColumn, type TableListGroup, type TableListRow } from "@/lib/pdf/TableListDocument";
import type { PropertyDemand } from "@/lib/models/demand";

// The table is 758pt wide after the "#" column (landscape A4 less margins).
const COLUMNS: TableColumn[] = [
  { label: "Ref", width: 94 },
  { label: "Client", width: 124, boldFirst: true },
  { label: "Looking for", width: 118 },
  { label: "Area", width: 112 },
  { label: "Budget", width: 110, boldFirst: true },
  { label: "Size", width: 64 },
  { label: "More", width: 72 },
  { label: "Status", width: 64 },
];

/** A short list of client demands (client, number, what they want, area, budget, size, family) as a
 *  printable office-record PDF.  ?purpose=all|buy|rent  &status=waiting|all */
export async function GET(request: Request) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "demands")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const purpose = url.searchParams.get("purpose");
  const which = purpose === "buy" || purpose === "rent" ? purpose : "all";
  const waitingOnly = url.searchParams.get("status") !== "all";

  const all = await demandService.list();
  const demands = all.filter((d) => !waitingOnly || d.status === "Open" || d.status === "Matched");

  const toRow = (d: PropertyDemand): TableListRow => {
    const more: string[] = [];
    if (d.minBedrooms != null) more.push(`${d.minBedrooms}+ beds`);
    if (d.purpose === "For Rent" && d.familyMembers != null) more.push(`${d.familyMembers} family`);
    return {
      cells: [
        [d.serialNo ?? ""].filter(Boolean),
        [clean(d.clientName), clean(d.clientPhone)].filter(Boolean),
        [clean(d.propertyTypes.length ? d.propertyTypes.join(", ") : "Any type")],
        [clean(d.locations.length ? d.locations.join(", ") : "Anywhere")],
        [clean(describeBudget(d))],
        [clean(describeSize(d))],
        more,
        [d.status === "Open" ? "Open" : d.status],
      ],
    };
  };

  const groupDefs = [
    { heading: "WANT TO BUY", key: "buy", match: (d: PropertyDemand) => d.purpose === "For Sale" },
    { heading: "WANT TO RENT", key: "rent", match: (d: PropertyDemand) => d.purpose === "For Rent" },
  ];
  const groups: TableListGroup[] = groupDefs
    .filter((g) => which === "all" || g.key === which)
    .map((g) => ({ heading: g.heading, rows: demands.filter(g.match).sort((a, b) => (a.serialNo ?? "").localeCompare(b.serialNo ?? "")).map(toRow) }))
    .filter((g) => g.rows.length > 0);

  const total = groups.reduce((s, g) => s + g.rows.length, 0);
  const subtitle = `${which === "all" ? "Buy and rent" : which === "buy" ? "Buy only" : "Rent only"}  |  ${waitingOnly ? "Still waiting (open or matched)" : "All demands"}  |  ${total} demands`;
  const printedOn = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" });

  const buffer = await renderToBuffer(
    <TableListDocument
      title="Client demands - short list"
      kind="OFFICE RECORD"
      subtitle={subtitle}
      columns={COLUMNS}
      groups={groups}
      printedOn={printedOn}
      printedBy={admin.name ?? "Admin"}
      footerNote="Confidential - for office record only. Contains clients' private contact numbers. Do not share outside the company."
    />
  );
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="demands-short-list-${which}-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
