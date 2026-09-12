import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { commissionRuleService } from "@/services/commissionRuleService";
import { CommissionRuleManager } from "@/components/admin/accounting/CommissionRuleManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function CommissionRulesPage() {
  await requireSection("accounting");
  const rules = await commissionRuleService.list();

  return (
    <div>
      <Link href="/admin/accounting/commissions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Commissions
      </Link>
      <div className="mt-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink">Commission Rules</h1>
        <p className="mt-1 text-sm text-muted">Configurable, condition-based commission rates — percentage, fixed, or tiered.</p>
      </div>
      <div className="mt-6">
        <CommissionRuleManager rules={rules} />
      </div>
    </div>
  );
}
