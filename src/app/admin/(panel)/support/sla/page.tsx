import { supportSlaService } from "@/services/supportSlaService";
import { supportDepartmentService } from "@/services/supportDepartmentService";
import { supportCategoryService } from "@/services/supportCategoryService";
import { requireSection } from "@/lib/guard";
import { SlaRuleManager } from "@/components/support/SlaRuleManager";

export const dynamic = "force-dynamic";

export default async function SlaRulesPage() {
  await requireSection("support");
  const [rules, departments, categories] = await Promise.all([supportSlaService.list(), supportDepartmentService.list(true), supportCategoryService.list(true)]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">SLA Rules</h1>
      <p className="mt-1 text-sm text-muted">Never a hard-coded business promise — every target here is configurable. The most specific active rule for a ticket&apos;s priority/department/category wins.</p>
      <div className="mt-6">
        <SlaRuleManager rules={rules} departments={departments} categories={categories} />
      </div>
    </div>
  );
}
