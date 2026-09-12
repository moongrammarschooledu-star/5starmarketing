import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail, MessageCircle } from "lucide-react";
import { teamService } from "@/services/teamService";
import { leadService } from "@/services/leadService";
import { appointmentService } from "@/services/appointmentService";
import { activityService } from "@/services/activityService";
import { profileService } from "@/services/profileService";
import { requireSection } from "@/lib/guard";
import { roleLabels, canManageFinance } from "@/lib/permissions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TeamStatusToggle } from "@/components/admin/TeamStatusToggle";
import { TeamMemberTabs } from "@/components/admin/TeamMemberTabs";
import { AgentFinancialPanel } from "@/components/admin/accounting/AgentFinancialPanel";
import { formatDateOnly } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function AdminTeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("team");
  const { id } = await params;

  const member = await teamService.getById(id);
  if (!member) notFound();

  const [leads, appointments, performance, activity, viewer] = await Promise.all([
    leadService.listByAgent(id),
    appointmentService.listByAgent(id),
    teamService.performanceFor(id),
    activityService.listByEntity("team", id),
    profileService.getCurrentAdmin(),
  ]);
  const canSeeFinancials = viewer ? canManageFinance(viewer.role) : false;

  return (
    <div>
      <Link href="/admin/team" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Sales Team
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{member.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {roleLabels[member.role]}
            {member.specialization ? ` · ${member.specialization}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              member.status === "Active" ? "bg-success/10 text-success" : "bg-muted/20 text-muted"
            }`}
          >
            {member.status}
          </span>
          <TeamStatusToggle id={member.id} status={member.status} />
          <Link href={`/admin/team/${member.id}/performance`} className="rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
            Full Performance
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-4 rounded-2xl border border-border bg-surface p-4 text-sm">
        {member.phone && (
          <a href={`tel:${member.phone}`} className="flex items-center gap-1.5 font-semibold text-ink hover:text-primary">
            <Phone className="h-4 w-4" /> {member.phone}
          </a>
        )}
        {member.whatsapp && (
          <a
            href={`https://wa.me/${member.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            className="flex items-center gap-1.5 font-semibold text-ink hover:text-primary"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        )}
        <a href={`mailto:${member.email}`} className="flex items-center gap-1.5 font-semibold text-ink hover:text-primary">
          <Mail className="h-4 w-4" /> {member.email}
        </a>
      </div>

      {member.bio && <p className="mt-4 text-sm text-muted">{member.bio}</p>}

      <div className="mt-6">
        <TeamMemberTabs
          overview={
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <MetricBox label="Assigned" value={performance.assigned} />
              <MetricBox label="Contacted" value={performance.contacted} />
              <MetricBox label="Interested" value={performance.interested} />
              <MetricBox label="Site Visits" value={performance.siteVisits} />
              <MetricBox label="Closed" value={performance.closed} />
              <MetricBox label="Lost" value={performance.lost} />
            </div>
          }
          leads={
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Property</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-muted">
                        No leads assigned yet.
                      </td>
                    </tr>
                  )}
                  {leads.map((l) => (
                    <tr key={l.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/leads/${l.id}`} className="font-semibold text-ink hover:text-primary">
                          {l.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{l.propertyTitle || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={l.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{formatDateOnly(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
          appointments={
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Property</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-muted">
                        No appointments assigned yet.
                      </td>
                    </tr>
                  )}
                  {appointments.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                      <td className="px-4 py-3 font-semibold text-ink">{a.name}</td>
                      <td className="px-4 py-3 text-muted">{a.propertyTitle}</td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {formatDateOnly(a.appointmentDate)} {a.appointmentTime}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-bold text-ink">{a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
          activity={
            <div className="space-y-2.5">
              {activity.length === 0 && <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">No account activity yet.</p>}
              {activity.map((a) => (
                <div key={a.id} className="rounded-xl border border-border bg-surface p-3.5 text-sm">
                  <span className="font-bold text-ink">{a.action}</span>
                  <span className="text-muted"> — {a.description}</span>
                  <div className="mt-1 text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString("en-GB")}</div>
                </div>
              ))}
            </div>
          }
          financials={canSeeFinancials ? <AgentFinancialPanel agentId={member.id} agentName={member.name} /> : undefined}
        />
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center">
      <div className="font-heading text-2xl font-extrabold text-ink">{value}</div>
      <div className="mt-1 text-xs font-semibold text-muted">{label}</div>
    </div>
  );
}
