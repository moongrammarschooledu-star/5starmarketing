import Link from "next/link";
import { legalDocumentService } from "@/services/legalDocumentService";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function LegalDocumentsPage() {
  await requireSection("legal");
  const documents = await legalDocumentService.listAll();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Legal Document Vault</h1>
      <p className="mt-1 text-sm text-muted">Every legal/title/ownership document across every property — upload and verify from a property&apos;s own Legal page.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Copy Type</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3 font-semibold text-ink">{d.documentTitle}</td>
                <td className="px-4 py-3 text-muted">
                  {d.propertyId ? (
                    <Link href={`/admin/legal/properties/${d.propertyId}`} className="text-primary hover:underline">
                      {d.propertyTitle}
                    </Link>
                  ) : (
                    d.projectName ?? "—"
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{d.copyType.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-muted">{d.documentExpiresAt ?? "—"}</td>
                <td className="px-4 py-3">{d.documentStatus && <StatusBadge status={d.documentStatus} />}</td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                  No legal documents uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
