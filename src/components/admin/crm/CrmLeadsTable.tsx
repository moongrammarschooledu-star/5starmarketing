import Link from "next/link";
import { Phone, Mail, MessageCircle } from "lucide-react";
import type { Lead } from "@/lib/models/lead";
import type { LeadSearchFilters } from "@/lib/models/crm";
import { crmStatusLabel } from "@/lib/models/crm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { CrmPaginationLinks } from "./CrmPaginationLinks";
import { whatsappUrlFor } from "@/lib/site";

function whatsappNumberFor(lead: Lead) {
  return (lead.whatsapp || lead.phone || "").replace(/[^0-9+]/g, "");
}

export function CrmLeadsTable({
  leads,
  total,
  page,
  totalPages,
  filters,
}: {
  leads: Lead[];
  total: number;
  page: number;
  totalPages: number;
  filters: LeadSearchFilters;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-muted">
        Showing {leads.length === 0 ? 0 : (page - 1) * (filters.pageSize ?? 20) + 1}
        {"–"}
        {(page - 1) * (filters.pageSize ?? 20) + leads.length} of {total} leads
      </p>

      {/* Desktop table */}
      <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-border bg-surface lg:block">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Property / Project</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Follow-Up</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-muted">
                  No leads match those filters.
                </td>
              </tr>
            )}
            {leads.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3 font-semibold text-ink">
                  <Link href={`/admin/crm/leads/${l.id}`} className="hover:text-primary">
                    {l.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" /> {l.phone}
                  </div>
                  {l.email && (
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-primary" /> {l.email}
                    </div>
                  )}
                </td>
                <td className="max-w-[180px] px-4 py-3 text-muted">
                  <span className="line-clamp-1">{l.propertyTitle ?? l.projectName ?? l.projectTitle ?? "General"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-bold text-ink">{l.leadType}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={crmStatusLabel(l.status)} />
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={l.priority} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={l.scoreLevel} /> <span className="ml-1 text-xs text-muted">{l.score}</span>
                </td>
                <td className="px-4 py-3 text-xs text-muted">{l.assignedTo || "Unassigned"}</td>
                <td className="px-4 py-3 text-xs text-muted">
                  {l.nextFollowUpDate ? (
                    <span className={new Date(l.nextFollowUpDate) < new Date(new Date().toDateString()) ? "font-bold text-primary" : ""}>
                      {new Date(l.nextFollowUpDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                  {new Date(l.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <a
                      href={whatsappUrlFor(whatsappNumberFor(l) || l.phone, `Assalam-o-Alaikum ${l.name}, this is 5STAR.M Estate & Builders.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-success hover:border-success"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                    <a
                      href={`tel:${l.phone}`}
                      title="Call"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-3 space-y-3 lg:hidden">
        {leads.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">No leads match those filters.</p>
        )}
        {leads.map((l) => (
          <Link key={l.id} href={`/admin/crm/leads/${l.id}`} className="block rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-ink">{l.name}</div>
                <div className="mt-0.5 text-xs text-muted">{l.propertyTitle ?? l.projectName ?? "General inquiry"}</div>
              </div>
              <StatusBadge status={crmStatusLabel(l.status)} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-primary" /> {l.phone}
              </span>
              <PriorityBadge priority={l.priority} />
              <StatusBadge status={l.scoreLevel} />
              <span className="rounded-full bg-ink/5 px-2 py-0.5 font-bold text-ink">{l.leadType}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{l.assignedTo || "Unassigned"}</span>
              <span>{new Date(l.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
          </Link>
        ))}
      </div>

      <CrmPaginationLinks page={page} totalPages={totalPages} />
    </div>
  );
}
