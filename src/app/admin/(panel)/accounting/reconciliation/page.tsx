import { reconciliationService } from "@/services/reconciliationService";
import { ReconciliationPanel } from "@/components/admin/accounting/ReconciliationPanel";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  await requireSection("accounting");
  const [unreconciled, records] = await Promise.all([reconciliationService.listUnreconciledTransactions(), reconciliationService.list()]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Bank Reconciliation</h1>
      <p className="mt-1 text-sm text-muted">Manual matching foundation — compare system transactions against your bank statement.</p>
      <div className="mt-6">
        <ReconciliationPanel unreconciled={unreconciled} records={records} />
      </div>
    </div>
  );
}
