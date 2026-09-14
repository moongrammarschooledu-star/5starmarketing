import Link from "next/link";
import { legalDocumentService } from "@/services/legalDocumentService";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { VerificationQueueActions } from "@/components/admin/legal/VerificationQueueActions";

export const dynamic = "force-dynamic";

export default async function LegalVerificationQueuePage() {
  await requireSection("legal");
  const all = await legalDocumentService.listAll();
  const queue = all.filter((d) => d.documentStatus === "UPLOADED" || d.documentStatus === "UNDER_REVIEW");

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Verification Queue</h1>
      <p className="mt-1 text-sm text-muted">Nothing is auto-verified on upload — every item here needs an explicit human decision.</p>
      <p className="mt-1 text-xs text-muted">External government/registry verification is not configured in this system — every verification here is manual.</p>

      <div className="mt-6 space-y-2">
        {queue.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-bold text-ink">{d.documentTitle}</p>
              <p className="text-xs text-muted">
                {d.propertyId ? (
                  <Link href={`/admin/legal/properties/${d.propertyId}`} className="text-primary hover:underline">
                    {d.propertyTitle}
                  </Link>
                ) : (
                  "No property linked"
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {d.documentStatus && <StatusBadge status={d.documentStatus} />}
              <VerificationQueueActions documentId={d.documentId} status={d.documentStatus ?? "UPLOADED"} />
            </div>
          </div>
        ))}
        {queue.length === 0 && <p className="text-sm text-muted">Nothing awaiting verification.</p>}
      </div>
    </div>
  );
}
