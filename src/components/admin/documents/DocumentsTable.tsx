import Link from "next/link";
import type { DocumentRecord } from "@/lib/models/document";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CrmPaginationLinks } from "@/components/admin/crm/CrmPaginationLinks";

export function DocumentsTable({ documents, total, page, totalPages, pageSize }: { documents: DocumentRecord[]; total: number; page: number; totalPages: number; pageSize: number }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted">
        Showing {documents.length === 0 ? 0 : (page - 1) * pageSize + 1}–{(page - 1) * pageSize + documents.length} of {total} documents
      </p>

      <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-border bg-surface lg:block">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Document #</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No documents match those filters.
                </td>
              </tr>
            )}
            {documents.map((d) => (
              <tr key={d.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3 font-semibold text-ink">
                  <Link href={`/admin/documents/${d.id}`} className="hover:text-primary">
                    {d.documentNumber}
                  </Link>
                </td>
                <td className="max-w-[200px] px-4 py-3 text-muted">
                  <span className="line-clamp-1">{d.title}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-bold text-ink">{d.documentTypeLabel ?? d.documentType}</span>
                </td>
                <td className="px-4 py-3 text-muted">{d.customerName ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{d.dealNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={d.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{new Date(d.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-3 lg:hidden">
        {documents.length === 0 && <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">No documents match those filters.</p>}
        {documents.map((d) => (
          <Link key={d.id} href={`/admin/documents/${d.id}`} className="block rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-ink">{d.documentNumber}</div>
                <div className="mt-0.5 line-clamp-1 text-xs text-muted">{d.title}</div>
              </div>
              <StatusBadge status={d.status} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{d.customerName ?? d.dealNumber ?? "—"}</span>
              <span>{new Date(d.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
          </Link>
        ))}
      </div>

      <CrmPaginationLinks page={page} totalPages={totalPages} />
    </div>
  );
}
