import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { accountService } from "@/services/accountService";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { dealService } from "@/services/dealService";
import { teamService } from "@/services/teamService";
import { ExpenseForm } from "@/components/admin/accounting/ExpenseForm";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  await requireSection("accounting");
  const [accounts, properties, projects, deals, agents] = await Promise.all([
    accountService.list("EXPENSE", true),
    propertyService.list(),
    projectService.list(),
    dealService.searchAll({ page: 1, pageSize: 100 }),
    teamService.listAssignable(),
  ]);

  return (
    <div>
      <Link href="/admin/accounting/expenses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Expenses
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-extrabold text-ink">New Expense</h1>

      <div className="mt-6">
        <ExpenseForm
          accounts={accounts}
          properties={properties.map((p) => ({ id: p.id, title: p.title }))}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          deals={deals.map((d) => ({ id: d.id, dealNumber: d.dealNumber }))}
          agents={agents.map((a) => ({ id: a.id, name: a.name }))}
        />
      </div>
    </div>
  );
}
