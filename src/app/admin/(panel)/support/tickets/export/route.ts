import { NextResponse } from "next/server";
import { ticketService } from "@/services/ticketService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";
import type { SupportTicketStatus, SupportTicketPriority } from "@/lib/models/support";

export async function GET(request: Request) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "support")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const { tickets } = await ticketService.list({
    status: (url.searchParams.get("status") as SupportTicketStatus) || undefined,
    priority: (url.searchParams.get("priority") as SupportTicketPriority) || undefined,
    departmentId: url.searchParams.get("departmentId") || undefined,
    q: url.searchParams.get("q") || undefined,
    pageSize: 5000,
  });

  const csv = toCsv(
    ["Ticket #", "Subject", "Customer", "Category", "Department", "Assigned To", "Priority", "Status", "SLA Response Breached", "SLA Resolution Breached", "Created At"],
    tickets.map((t) => [t.ticketNumber, t.subject, t.customerName ?? "", t.categoryLabel ?? t.categoryCode, t.departmentName ?? "", t.assignedStaffName ?? "", t.priority, t.status, t.slaResponseBreached ? "Yes" : "No", t.slaResolutionBreached ? "Yes" : "No", t.createdAt])
  );

  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="support-tickets.csv"' },
  });
}
