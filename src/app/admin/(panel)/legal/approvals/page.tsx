import { legalApprovalService } from "@/services/legalApprovalService";
import { profileService } from "@/services/profileService";
import { canManageLegal } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { ApprovalDecisionButtons } from "@/components/admin/legal/ApprovalDecisionButtons";

export const dynamic = "force-dynamic";

export default async function LegalApprovalsPage() {
  await requireSection("legal");
  const [approvals, admin] = await Promise.all([legalApprovalService.listPending(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageLegal(admin.role) : false;

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Pending Legal Approvals</h1>
      <p className="mt-1 text-sm text-muted">Every approval decision is recorded to the legal audit log.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Requested By</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {approvals.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3 font-semibold text-ink">{a.subjectType.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-muted">{a.approvalStage}</td>
                <td className="px-4 py-3 text-muted">{a.requestedByName ?? "—"}</td>
                <td className="px-4 py-3">{canManage && <ApprovalDecisionButtons id={a.id} />}</td>
              </tr>
            ))}
            {approvals.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                  No pending approvals.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
