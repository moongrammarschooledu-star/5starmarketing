import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { constructionProjectService } from "@/services/constructionProjectService";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export default async function ConstructionProjectsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireSection("construction");
  const { status, q } = await searchParams;
  const projects = await constructionProjectService.list({ status: status as never, q });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/construction" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to Construction
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Construction Projects</h1>
        </div>
        <Link href="/admin/construction/projects/new" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> New Project
        </Link>
      </div>

      <form className="mt-4 flex flex-wrap gap-2" method="get">
        <input type="text" name="q" defaultValue={q} placeholder="Search project # or name..." className="min-w-[220px] flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
          <option value="">All Statuses</option>
          {["PLANNING", "APPROVAL_PENDING", "APPROVED", "MOBILIZATION", "IN_PROGRESS", "ON_HOLD", "DELAYED", "PRACTICALLY_COMPLETE", "COMPLETED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
          Filter
        </button>
        {(status || q) && (
          <Link href="/admin/construction/projects" className="flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-muted hover:text-primary">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Project #</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Project Manager</th>
              <th className="px-4 py-3">Approved Budget</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/construction/projects/${p.id}/overview`} className="font-semibold text-primary hover:underline">
                    {p.projectNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink">{p.projectName}</td>
                <td className="px-4 py-3 text-muted">{p.projectType}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-muted">{p.projectManagerName ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{p.approvedBudget != null ? formatPKR(p.approvedBudget) : "—"}</td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                  No construction projects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
