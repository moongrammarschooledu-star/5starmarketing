import { legalContractService } from "@/services/legalContractService";
import { propertyService } from "@/services/propertyService";
import { profileService } from "@/services/profileService";
import { canManageLegal } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { NewLegalContractForm } from "@/components/admin/legal/NewLegalContractForm";
import { LegalContractStatusActions } from "@/components/admin/legal/LegalContractStatusActions";

export const dynamic = "force-dynamic";

export default async function LegalContractsPage({ searchParams }: { searchParams: Promise<{ propertyId?: string }> }) {
  await requireSection("legal");
  const { propertyId } = await searchParams;
  const [contracts, properties, admin] = await Promise.all([legalContractService.list(), propertyService.list(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageLegal(admin.role) : false;

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Legal Contracts</h1>
      <p className="mt-1 text-sm text-muted">An executed contract is never edited in place — a change supersedes it with a new contract.</p>

      {canManage && (
        <div className="mt-4">
          <NewLegalContractForm properties={properties.map((p) => ({ id: p.id, title: p.title }))} defaultPropertyId={propertyId} />
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Contract #</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Signature</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3 font-semibold text-ink">{c.contractNumber}</td>
                <td className="px-4 py-3 text-muted">{c.contractType.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-muted">{c.propertyTitle ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{c.signatureStatus ?? "No signature workflow"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 text-right">{canManage && <LegalContractStatusActions contract={c} />}</td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                  No contracts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
