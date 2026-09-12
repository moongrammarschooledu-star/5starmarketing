import { AlertTriangle } from "lucide-react";
import { payableService } from "@/services/payableService";
import { PayableManager } from "@/components/admin/accounting/PayableManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function PayablesPage() {
  await requireSection("accounting");
  await payableService.markOverdue().catch(() => {});

  let payables: Awaited<ReturnType<typeof payableService.list>> = [];
  let loadError: string | null = null;
  try {
    payables = await payableService.list();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load payables.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Payables</h1>
      <p className="mt-1 text-sm text-muted">Money the business owes vendors, contractors, agents, and other parties.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6">
        <PayableManager payables={payables} />
      </div>
    </div>
  );
}
