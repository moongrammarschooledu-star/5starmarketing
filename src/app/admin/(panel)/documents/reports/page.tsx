import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { documentReportsService, type DocumentReportRow } from "@/services/documentReportsService";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function DocumentReportsPage() {
  await requireSection("documents");
  const report = await documentReportsService.summary();

  return (
    <div>
      <Link href="/admin/documents" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Documents
      </Link>

      <div className="mt-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink">Document Reports</h1>
        <p className="mt-1 text-sm text-muted">{report.totalDocuments} documents on record.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ReportTable title="By Document Type" rows={report.byType} />
        <ReportTable title="By Agent" rows={report.byAgent} />
        <ReportTable title="By Project" rows={report.byProject} />
        <ReportTable title="By Property" rows={report.byProperty} />
        <ReportTable title="By Customer" rows={report.byCustomer} />

        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-heading text-base font-bold text-ink">By Month</h2>
          {report.byMonth.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No data yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {report.byMonth.map((m) => (
                <div key={m.month} className="flex items-center justify-between rounded-lg bg-surface-muted p-3 text-sm">
                  <span className="font-semibold text-ink">{m.month}</span>
                  <span className="text-muted">{m.total} uploaded</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportTable({ title, rows }: { title: string; rows: DocumentReportRow[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-heading text-base font-bold text-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No data yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[400px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Name</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">Approved</th>
                <th className="py-2 text-right">Rejected</th>
                <th className="py-2 text-right">Pending</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-border last:border-0">
                  <td className="py-2 font-semibold text-ink">{r.label}</td>
                  <td className="py-2 text-right text-ink">{r.total}</td>
                  <td className="py-2 text-right text-success">{r.approved}</td>
                  <td className="py-2 text-right text-primary">{r.rejected}</td>
                  <td className="py-2 text-right text-muted">{r.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
