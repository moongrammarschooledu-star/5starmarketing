import { NextResponse } from "next/server";
import { leadService } from "@/services/leadService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { parseCrmSearchParams } from "@/lib/crmSearchParams";
import { crmStatusLabel } from "@/lib/models/crm";
import { toCsv } from "@/lib/csv";

// Route handlers aren't wrapped by the /admin layout, so this file must
// check auth + role itself — same reasoning as reports/export/route.ts.
async function requireCrmAccess() {
  const admin = await profileService.getCurrentAdmin();
  return !!admin && canAccess(admin.role, "leads");
}

export async function GET(request: Request) {
  if (!(await requireCrmAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const filters = parseCrmSearchParams(sp);

  let csv = "";
  try {
    const leads = await leadService.searchAll(filters);
    csv = toCsv(
      ["Lead ID", "Name", "Phone", "WhatsApp", "Email", "Status", "Priority", "Lead Type", "Source", "Property", "Project", "Agent", "Purpose", "Budget Min", "Budget Max", "Next Follow-Up", "Created"],
      leads.map((l) => [
        l.id,
        l.name,
        l.phone,
        l.whatsapp ?? "",
        l.email ?? "",
        crmStatusLabel(l.status),
        l.priority,
        l.leadType,
        l.source,
        l.propertyTitle ?? "",
        l.projectName ?? l.projectTitle ?? "",
        l.assignedTo ?? "",
        l.purpose ?? "",
        l.budgetMin ?? "",
        l.budgetMax ?? "",
        l.nextFollowUpDate ?? "",
        l.createdAt.slice(0, 10),
      ])
    );
  } catch (e) {
    console.error("crm/leads/export failed:", e);
    return NextResponse.json({ error: "Could not export leads." }, { status: 500 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="crm-leads.csv"`,
    },
  });
}
