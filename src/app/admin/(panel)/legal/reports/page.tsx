import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

const exports = [
  { type: "ownership", label: "Ownership Report" },
  { type: "ownership-transfers", label: "Ownership Transfer History" },
  { type: "legal-documents", label: "Legal Document Register" },
  { type: "document-expiry", label: "Document Expiry Report" },
  { type: "document-verification", label: "Document Verification Status" },
  { type: "due-diligence", label: "Due-Diligence Case Report" },
  { type: "due-diligence-checklist", label: "Due-Diligence Checklist Completion" },
  { type: "compliance", label: "Compliance Report" },
  { type: "encumbrances", label: "Encumbrance Report" },
  { type: "legal-cases", label: "Legal Case Report" },
  { type: "legal-notices", label: "Legal Notice Report" },
  { type: "contracts", label: "Contract Report" },
  { type: "legal-approvals", label: "Legal Approval Report" },
  { type: "legal-risks", label: "Legal Risk Report" },
];

export default async function LegalReportsPage() {
  await requireSection("legal");
  return (
    <div>
      <Link href="/admin/legal" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Legal
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Legal Reports</h1>
      <p className="mt-1 text-sm text-muted">Every export reflects only what has actually been recorded — not a legal opinion.</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {exports.map((e) => (
          <a key={e.type} href={`/admin/legal/reports/export?type=${e.type}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-primary">
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
