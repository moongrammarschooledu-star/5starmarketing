import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemandForm } from "@/components/admin/DemandForm";
import { updateDemandAction } from "@/lib/actions/demands.actions";
import { requireSection } from "@/lib/guard";
import { demandService } from "@/services/demandService";
import { teamService } from "@/services/teamService";

export const metadata: Metadata = { title: "Edit Demand" };
export const dynamic = "force-dynamic";

export default async function EditDemandPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("demands");
  const { id } = await params;
  const [demand, team] = await Promise.all([demandService.getById(id), teamService.listAssignable().catch(() => [])]);
  if (!demand) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Edit Demand</h1>
      <p className="mt-1 text-sm text-muted">{demand.clientName}</p>
      <div className="mt-6">
        <DemandForm
          action={updateDemandAction.bind(null, id)}
          initialValues={demand}
          team={team.map((t) => ({ id: t.id, name: t.name }))}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
