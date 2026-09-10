import { NextResponse } from "next/server";
import { documentService } from "@/services/documentService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { parseDocumentSearchParams } from "@/lib/documentSearchParams";
import { toCsv } from "@/lib/csv";

async function requireDocumentsAccess() {
  const admin = await profileService.getCurrentAdmin();
  return !!admin && canAccess(admin.role, "documents");
}

/** Metadata only (section 47) — never the private file itself, only
 *  the documents row's own descriptive fields. */
export async function GET(request: Request) {
  if (!(await requireDocumentsAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const filters = parseDocumentSearchParams(sp);

  let csv = "";
  try {
    const documents = await documentService.searchAll(filters);
    csv = toCsv(
      ["Document Number", "Title", "Type", "Status", "Customer", "Property", "Project", "Deal", "Uploaded", "Expires"],
      documents.map((d) => [d.documentNumber, d.title, d.documentTypeLabel ?? d.documentType, d.status, d.customerName ?? "", d.propertyTitle ?? "", d.projectName ?? "", d.dealNumber ?? "", d.createdAt.slice(0, 10), d.expiresAt ?? ""])
    );
  } catch (e) {
    console.error("documents/export failed:", e);
    return NextResponse.json({ error: "Could not export documents." }, { status: 500 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="documents.csv"`,
    },
  });
}
