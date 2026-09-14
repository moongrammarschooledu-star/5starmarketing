import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ticketService } from "@/services/ticketService";
import { complaintService } from "@/services/complaintService";
import { escalationService } from "@/services/escalationService";
import { supportReportService } from "@/services/supportReportService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "support")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "ticket-summary";
  const supabase = await createClient();

  let csv = "";
  try {
    if (type === "ticket-summary" || type === "ticket-volume") {
      const { tickets } = await ticketService.list({ pageSize: 5000 });
      csv = toCsv(
        ["Ticket #", "Subject", "Category", "Department", "Priority", "Status", "Created At"],
        tickets.map((t) => [t.ticketNumber, t.subject, t.categoryLabel ?? t.categoryCode, t.departmentName ?? "", t.priority, t.status, t.createdAt])
      );
    } else if (type === "open-tickets") {
      const { tickets } = await ticketService.list({ pageSize: 5000 });
      const open = tickets.filter((t) => !["RESOLVED", "CLOSED", "CANCELLED"].includes(t.status));
      csv = toCsv(["Ticket #", "Subject", "Department", "Assigned To", "Priority", "Status"], open.map((t) => [t.ticketNumber, t.subject, t.departmentName ?? "", t.assignedStaffName ?? "", t.priority, t.status]));
    } else if (type === "resolved-tickets") {
      const { tickets } = await ticketService.list({ status: "RESOLVED", pageSize: 5000 });
      csv = toCsv(["Ticket #", "Subject", "Resolved At", "Assigned To"], tickets.map((t) => [t.ticketNumber, t.subject, t.resolvedAt ?? "", t.assignedStaffName ?? ""]));
    } else if (type === "sla-performance") {
      const { tickets } = await ticketService.list({ pageSize: 5000 });
      csv = toCsv(
        ["Ticket #", "Priority", "Response Due", "Response Breached", "Resolution Due", "Resolution Breached"],
        tickets.map((t) => [t.ticketNumber, t.priority, t.slaResponseDueAt ?? "", t.slaResponseBreached ? "Yes" : "No", t.slaResolutionDueAt ?? "", t.slaResolutionBreached ? "Yes" : "No"])
      );
    } else if (type === "complaints") {
      const complaints = await complaintService.list();
      csv = toCsv(["Complaint #", "Ticket #", "Severity", "Officer", "Status"], complaints.map((c) => [c.complaintNumber, c.ticketNumber ?? "", c.severity, c.assignedOfficerName ?? "", c.status]));
    } else if (type === "department-performance") {
      const rows = await supportReportService.departmentPerformance();
      csv = toCsv(["Department", "Open", "Resolved", "SLA Breaches", "Avg CSAT"], rows.map((r) => [r.departmentName, r.openTickets, r.resolvedTickets, r.slaBreaches, r.averageCsat ?? ""]));
    } else if (type === "staff-performance") {
      const rows = await supportReportService.staffPerformance();
      csv = toCsv(["Staff", "Open", "Resolved", "Avg Resolution (min)", "Avg CSAT"], rows.map((r) => [r.staffName, r.openTickets, r.resolvedTickets, r.averageResolutionMinutes ?? "", r.averageCsat ?? ""]));
    } else if (type === "csat") {
      const { data } = await supabase.from("support_tickets").select("ticket_number, satisfaction_rating, satisfaction_category, would_recommend, feedback_submitted_at").not("satisfaction_rating", "is", null);
      csv = toCsv(["Ticket #", "Rating", "Category", "Would Recommend", "Submitted At"], (data ?? []).map((r) => [r.ticket_number, r.satisfaction_rating, r.satisfaction_category ?? "", r.would_recommend ? "Yes" : "No", r.feedback_submitted_at ?? ""]));
    } else if (type === "escalations") {
      const escalations = await escalationService.listAll(5000);
      csv = toCsv(["Reason", "Previous Dept", "New Dept", "Previous Assignee", "New Assignee", "Date"], escalations.map((e) => [e.reason, e.previousDepartmentName ?? "", e.newDepartmentName ?? "", e.previousAssigneeName ?? "", e.newAssigneeName ?? "", e.createdAt]));
    } else if (type === "category-report") {
      const rows = await supportReportService.byCategory();
      csv = toCsv(["Category", "Ticket Count"], rows.map((r) => [r.label, r.count]));
    } else if (type === "property-support") {
      const { data } = await supabase.from("support_tickets").select("ticket_number, status, properties(title)").not("property_id", "is", null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      csv = toCsv(["Property", "Ticket #", "Status"], ((data ?? []) as any[]).map((r) => [r.properties?.title ?? "", r.ticket_number, r.status]));
    } else if (type === "project-support") {
      const { data } = await supabase.from("support_tickets").select("ticket_number, status, projects(name)").not("project_id", "is", null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      csv = toCsv(["Project", "Ticket #", "Status"], ((data ?? []) as any[]).map((r) => [r.projects?.name ?? "", r.ticket_number, r.status]));
    } else {
      return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
    }
  } catch (e) {
    console.error("support report export failed:", e);
    return NextResponse.json({ error: "Could not export this report." }, { status: 500 });
  }

  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="support-${type}.csv"` },
  });
}
