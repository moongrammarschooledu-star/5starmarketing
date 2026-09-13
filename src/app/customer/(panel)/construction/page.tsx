import Link from "next/link";
import { customerService } from "@/services/customerService";
import { constructionProjectService } from "@/services/constructionProjectService";
import { constructionProgressService } from "@/services/constructionProgressService";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata = { title: "Construction Progress" };
export const dynamic = "force-dynamic";

export default async function CustomerConstructionPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const projects = await constructionProjectService.listForCustomer(customer.id);
  const progressByProject = Object.fromEntries(await Promise.all(projects.map(async (p) => [p.id, await constructionProgressService.overallProgress(p.id)] as const)));

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Construction Progress</h1>
      <p className="mt-1 text-sm text-muted">Track the progress of your construction project(s).</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const progress = progressByProject[p.id];
          return (
            <Link key={p.id} href={`/customer/construction/${p.id}`} className="block rounded-2xl border border-border bg-surface p-4 hover:border-primary">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">{p.projectName}</p>
                  <p className="mt-0.5 text-xs text-muted">{p.projectNumber}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.round(progress.actualPercent))}%` }} />
                </div>
                <p className="mt-1.5 text-xs font-semibold text-ink">{progress.actualPercent.toFixed(0)}% complete</p>
              </div>
              {p.location && <p className="mt-2 text-xs text-muted">{p.location}</p>}
            </Link>
          );
        })}
        {projects.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-muted">No construction projects linked to your account yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
