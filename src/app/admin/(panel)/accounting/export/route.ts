import { NextResponse } from "next/server";
import { financialTransactionService } from "@/services/financialTransactionService";
import { expenseService } from "@/services/expenseService";
import { receivableService } from "@/services/receivableService";
import { payableService } from "@/services/payableService";
import { agentCommissionService } from "@/services/agentCommissionService";
import { profileService } from "@/services/profileService";
import { canManageFinance, canAccess } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";
import { formatDateOnly } from "@/lib/date";

async function requireExportAccess() {
  const admin = await profileService.getCurrentAdmin();
  return !!admin && canAccess(admin.role, "accounting") && canManageFinance(admin.role);
}

export async function GET(request: Request) {
  if (!(await requireExportAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "income";

  let csv = "";
  let filename = `${type}.csv`;
  try {
    if (type === "income") {
      const { transactions } = await financialTransactionService.search({ transactionType: "INCOME", page: 1, pageSize: 5000 });
      csv = toCsv(
        ["Number", "Date", "Description", "Deal", "Customer", "Property", "Amount", "Payment Method", "Status"],
        transactions.map((t) => [t.transactionNumber, t.transactionDate, t.description ?? "", t.dealNumber ?? "", t.customerName ?? "", t.propertyTitle ?? "", t.amount, t.paymentMethod ?? "", t.status])
      );
    } else if (type === "expenses") {
      const { expenses } = await expenseService.search({ page: 1, pageSize: 5000 });
      csv = toCsv(
        ["Number", "Date", "Category", "Description", "Vendor", "Amount", "Property", "Project", "Deal", "Status"],
        expenses.map((e) => [e.expenseNumber, e.expenseDate, e.accountName ?? "", e.description, e.vendor ?? "", e.amount, e.propertyTitle ?? "", e.projectName ?? "", e.dealNumber ?? "", e.status])
      );
    } else if (type === "receivables") {
      const receivables = await receivableService.list();
      csv = toCsv(
        ["Deal", "Customer", "Property", "Total", "Received", "Outstanding", "Due Date", "Days Overdue", "Status", "Agent"],
        receivables.map((r) => [r.dealNumber, r.customerName ?? "", r.propertyTitle ?? "", r.totalAmount, r.receivedAmount, r.outstandingAmount, r.dueDate ?? "", r.daysOverdue, r.status, r.assignedAgentName ?? ""])
      );
    } else if (type === "payables") {
      const payables = await payableService.list();
      csv = toCsv(
        ["Number", "Vendor", "Description", "Amount", "Paid", "Outstanding", "Due Date", "Status"],
        payables.map((p) => [p.payableNumber, p.vendor, p.description ?? "", p.amount, p.paidAmount, p.outstandingAmount, p.dueDate ?? "", p.status])
      );
    } else if (type === "commissions") {
      const { commissions } = await agentCommissionService.search({ page: 1, pageSize: 5000 });
      csv = toCsv(
        ["Number", "Agent", "Deal", "Basis", "Rate", "Amount", "Paid", "Status", "Date"],
        commissions.map((c) => [c.commissionNumber, c.agentName ?? "", c.dealNumber ?? "", c.basis, c.commissionRate ?? "", c.commissionAmount, c.paidAmount, c.status, formatDateOnly(c.createdAt)])
      );
    } else {
      return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
    }
    filename = `${type}.csv`;
  } catch (e) {
    console.error("accounting/export failed:", e);
    return NextResponse.json({ error: "Could not export this report." }, { status: 500 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
