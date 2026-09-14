import { legalNoticeService } from "@/services/legalNoticeService";
import { propertyService } from "@/services/propertyService";
import { profileService } from "@/services/profileService";
import { canManageLegal } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { NewLegalNoticeForm } from "@/components/admin/legal/NewLegalNoticeForm";

export const dynamic = "force-dynamic";

export default async function LegalNoticesPage({ searchParams }: { searchParams: Promise<{ propertyId?: string }> }) {
  await requireSection("legal");
  const { propertyId } = await searchParams;
  const [notices, properties, admin] = await Promise.all([legalNoticeService.list(), propertyService.list(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageLegal(admin.role) : false;

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Legal Notices</h1>
      <p className="mt-1 text-sm text-muted">Delivery is only ever confirmed from a real Communication Center message status or an explicit manual confirmation.</p>

      {canManage && (
        <div className="mt-4">
          <NewLegalNoticeForm properties={properties.map((p) => ({ id: p.id, title: p.title }))} defaultPropertyId={propertyId} />
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Notice #</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Sent Via</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {notices.map((n) => (
              <tr key={n.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3 font-semibold text-ink">{n.noticeNumber}</td>
                <td className="px-4 py-3 text-muted">{n.recipientName}</td>
                <td className="px-4 py-3 text-muted">{n.noticeType.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-muted">{n.sentVia ?? "—"} {n.communicationMessageStatus ? `(${n.communicationMessageStatus})` : ""}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={n.status} />
                </td>
              </tr>
            ))}
            {notices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                  No legal notices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
