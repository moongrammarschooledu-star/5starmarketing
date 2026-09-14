import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

const exports = [
  { type: "ticket-summary", label: "Ticket Summary Report" },
  { type: "ticket-volume", label: "Ticket Volume Report" },
  { type: "open-tickets", label: "Open Tickets Report" },
  { type: "resolved-tickets", label: "Resolved Tickets Report" },
  { type: "sla-performance", label: "SLA Performance Report" },
  { type: "complaints", label: "Complaint Report" },
  { type: "department-performance", label: "Department Performance Report" },
  { type: "staff-performance", label: "Staff Performance Report" },
  { type: "csat", label: "Customer Satisfaction Report" },
  { type: "escalations", label: "Escalation Report" },
  { type: "category-report", label: "Category Report" },
  { type: "property-support", label: "Property Support Report" },
  { type: "project-support", label: "Project Support Report" },
];

export default async function SupportReportsPage() {
  await requireSection("support");
  return (
    <div>
      <Link href="/admin/support" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Support
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Support Reports</h1>
      <p className="mt-1 text-sm text-muted">Every export reflects only what has actually been recorded.</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {exports.map((e) => (
          <a key={e.type} href={`/admin/support/reports/export?type=${e.type}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-primary">
            <Download className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-bold text-ink">{e.label}</p>
              <p className="text-xs text-muted">Export as CSV</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
