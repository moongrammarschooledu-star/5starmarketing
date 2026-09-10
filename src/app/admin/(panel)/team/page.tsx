import Link from "next/link";
import { AlertTriangle, Users, UserCheck, PlusCircle } from "lucide-react";
import { teamService } from "@/services/teamService";
import { requireSection } from "@/lib/guard";
import { roleLabels } from "@/lib/permissions";
import { StatCard } from "@/components/admin/StatCard";
import { TeamStatusToggle } from "@/components/admin/TeamStatusToggle";
import { TeamSearchBox } from "@/components/admin/TeamSearchBox";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireSection("team");
  const { q } = await searchParams;

  let members: Awaited<ReturnType<typeof teamService.list>> = [];
  let loadError: string | null = null;
  try {
    members = q ? await teamService.search(q) : await teamService.list();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the sales team.";
  }

  const activeCount = members.filter((m) => m.status === "Active").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Sales Team</h1>
          <p className="mt-1 text-sm text-muted">Manage agents, sales managers and admins, and see their lead load.</p>
        </div>
        <Link
          href="/admin/team/create"
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          <PlusCircle className="h-4.5 w-4.5" /> Add Team Member
        </Link>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Team Members" value={members.length} icon={Users} />
        <StatCard label="Active" value={activeCount} icon={UserCheck} tone="success" />
        <StatCard label="Open Leads" value={members.reduce((sum, m) => sum + m.openLeads, 0)} icon={Users} tone="primary" />
      </div>

      <div className="mt-6">
        <TeamSearchBox defaultValue={q ?? ""} />
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-border bg-surface lg:block">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Open</th>
              <th className="px-4 py-3">Closed</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  No team members found.
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/team/${m.id}`} className="font-semibold text-ink hover:text-primary">
                    {m.name}
                  </Link>
                  {m.specialization && <div className="text-xs text-muted">{m.specialization}</div>}
                </td>
                <td className="px-4 py-3 text-muted">{roleLabels[m.role]}</td>
                <td className="px-4 py-3 text-xs text-muted">
                  {m.phone || "—"}
                  {m.email && <div>{m.email}</div>}
                </td>
                <td className="px-4 py-3 text-muted">{m.assignedLeads}</td>
                <td className="px-4 py-3 text-muted">{m.openLeads}</td>
                <td className="px-4 py-3 text-muted">{m.closedLeads}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      m.status === "Active" ? "bg-success/10 text-success" : "bg-muted/20 text-muted"
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <TeamStatusToggle id={m.id} status={m.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-3 lg:hidden">
        {members.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">No team members found.</p>
        )}
        {members.map((m) => (
          <div key={m.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <Link href={`/admin/team/${m.id}`} className="font-bold text-ink hover:text-primary">
                {m.name}
              </Link>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  m.status === "Active" ? "bg-success/10 text-success" : "bg-muted/20 text-muted"
                }`}
              >
                {m.status}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted">
              {roleLabels[m.role]} · {m.phone || m.email}
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted">
              <span>{m.assignedLeads} assigned</span>
              <span>{m.openLeads} open</span>
              <span>{m.closedLeads} closed</span>
            </div>
            <div className="mt-3">
              <TeamStatusToggle id={m.id} status={m.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
