import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { projectService } from "@/services/projectService";
import { inventoryService } from "@/services/inventoryService";
import { InventoryViewSwitcher } from "@/components/admin/inventory/InventoryViewSwitcher";
import { InventoryRealtimeRefresher } from "@/components/admin/inventory/InventoryRealtimeRefresher";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function ProjectInventoryMatrixPage({ params }: { params: Promise<{ projectId: string }> }) {
  await requireSection("inventory");
  const { projectId } = await params;
  const project = await projectService.getById(projectId);
  if (!project) notFound();

  const units = await inventoryService.listByProject(projectId);

  return (
    <div>
      <InventoryRealtimeRefresher projectId={projectId} />

      <Link href="/admin/inventory/projects" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Project Inventory
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{project.name} — Inventory</h1>
          <p className="mt-1 text-sm text-muted">{units.length} unit{units.length === 1 ? "" : "s"} · updates live as other admins reserve or book units.</p>
        </div>
        <Link href={`/admin/inventory/new?project=${projectId}`} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover">
          Add Unit
        </Link>
      </div>

      <div className="mt-6">
        <InventoryViewSwitcher units={units} />
      </div>
    </div>
  );
}
