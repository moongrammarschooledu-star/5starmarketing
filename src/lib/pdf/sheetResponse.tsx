import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { DetailSheetDocument } from "./DetailSheetDocument";
import type { SheetData } from "./detailSheets";

/** Renders an office-record sheet as a downloadable PDF. */
export async function sheetPdfResponse(sheet: SheetData, printedBy: string): Promise<NextResponse> {
  const printedOn = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
  const buffer = await renderToBuffer(<DetailSheetDocument sheet={sheet} printedOn={printedOn} printedBy={printedBy} />);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${sheet.fileName}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
