import type { Metadata } from "next";
import { DemandForm } from "@/components/admin/DemandForm";
import { createDemandAction } from "@/lib/actions/demands.actions";
import { requireSection } from "@/lib/guard";
import { teamService } from "@/services/teamService";

export const metadata: Metadata = { title: "Add Demand" };
export const dynamic = "force-dynamic";

export default async function NewDemandPage() {
  await requireSection("demands");
  const team = await teamService.listAssignable().catch(() => []);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Add Demand</h1>
      <p className="mt-1 text-sm text-muted">Write down what the client is looking for. The system will show which of our properties fit.</p>
      <div className="mt-6">
        <DemandForm action={createDemandAction} team={team.map((t) => ({ id: t.id, name: t.name }))} submitLabel="Save Demand" />
      </div>
    </div>
  );
}
