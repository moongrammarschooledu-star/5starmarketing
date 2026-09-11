import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { leadScoringService } from "@/services/leadScoringService";
import { followUpRuleService } from "@/services/followUpRuleService";
import { LeadScoringRulesManager } from "@/components/admin/marketing/LeadScoringRulesManager";
import { LeadSlaRulesManager } from "@/components/admin/marketing/LeadSlaRulesManager";
import { FollowUpRulesManager } from "@/components/admin/marketing/FollowUpRulesManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AutomationRulesPage() {
  await requireSection("marketing");

  const [scoringRules, slaRules, followUpRules] = await Promise.all([leadScoringService.listRules(), leadScoringService.listSlaRules(), followUpRuleService.list()]);

  return (
    <div>
      <Link href="/admin/marketing/automation" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Automation
      </Link>
      <div className="mt-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink">Automation Rules</h1>
        <p className="mt-1 text-sm text-muted">Lead scoring, response SLA, and follow-up scheduling — every value here is admin-configurable, never hardcoded.</p>
      </div>

      <div className="mt-6 space-y-6">
        <LeadScoringRulesManager rules={scoringRules} />
        <LeadSlaRulesManager rules={slaRules} />
        <FollowUpRulesManager rules={followUpRules} />
      </div>
    </div>
  );
}
