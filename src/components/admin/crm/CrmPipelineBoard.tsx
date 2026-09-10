"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, CalendarClock } from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/models/lead";
import { leadStatuses } from "@/lib/models/lead";
import { crmStatusLabel } from "@/lib/models/crm";
import { updateLeadStatusAction } from "@/lib/actions/leads.actions";
import { whatsappUrlFor } from "@/lib/site";
import { useToast } from "@/components/admin/ToastProvider";
import { PriorityBadge } from "./PriorityBadge";

const COLUMN_TONE: Record<LeadStatus, string> = {
  New: "border-primary/30 bg-primary/5",
  Contacted: "border-ink/15 bg-ink/5",
  Interested: "border-success/30 bg-success/5",
  "Follow-Up": "border-amber-500/30 bg-amber-500/5",
  "Site Visit": "border-burgundy/30 bg-burgundy/5",
  Negotiation: "border-primary/50 bg-primary/10",
  Closed: "border-success/30 bg-success/10",
  Lost: "border-muted/30 bg-muted/10",
};

function formatBudget(min?: number, max?: number) {
  if (!min && !max) return null;
  const fmt = (n: number) => (n >= 10000000 ? `${(n / 10000000).toFixed(1)}Cr` : n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n.toLocaleString());
  if (min && max) return `Rs. ${fmt(min)} – ${fmt(max)}`;
  return `Rs. ${fmt(min ?? max ?? 0)}`;
}

export function CrmPipelineBoard({ leads }: { leads: Lead[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const columns = useMemo(() => {
    const map = new Map<LeadStatus, Lead[]>(leadStatuses.map((s) => [s, []]));
    for (const lead of leads) map.get(lead.status)?.push(lead);
    return map;
  }, [leads]);

  function move(id: string, next: LeadStatus) {
    startTransition(async () => {
      await updateLeadStatusAction(id, next);
      toast.show(`Moved to ${crmStatusLabel(next)}.`);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-4 overflow-x-auto pb-2 sm:grid-cols-2 lg:flex lg:gap-4">
      {leadStatuses.map((status) => {
        const items = columns.get(status) ?? [];
        return (
          <div key={status} className={`rounded-2xl border p-3 lg:w-80 lg:shrink-0 ${COLUMN_TONE[status]}`}>
            <div className="flex items-center justify-between px-1">
              <h3 className="font-heading text-sm font-bold text-ink">{crmStatusLabel(status)}</h3>
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-muted-foreground">{items.length}</span>
            </div>

            <div className="mt-3 space-y-2.5">
              {items.length === 0 && (
                <p className="rounded-xl border border-dashed border-border bg-surface/60 p-4 text-center text-xs text-muted">No leads here.</p>
              )}
              {items.map((lead) => {
                const budget = formatBudget(lead.budgetMin, lead.budgetMax);
                return (
                  <div key={lead.id} className="rounded-xl border border-border bg-surface p-3 shadow-sm">
                    <Link href={`/admin/crm/leads/${lead.id}`} className="block">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-sm font-bold text-ink">{lead.name}</span>
                        <PriorityBadge priority={lead.priority} />
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-xs text-muted">{lead.propertyTitle ?? lead.projectName ?? "General inquiry"}</div>
                      {budget && <div className="mt-1 text-xs font-semibold text-primary">{budget}</div>}
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{lead.assignedTo || "Unassigned"}</span>
                        <span>{new Date(lead.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                      </div>
                      {lead.nextFollowUpDate && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
                          <CalendarClock className="h-3 w-3" /> {new Date(lead.nextFollowUpDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </div>
                      )}
                    </Link>

                    <div className="mt-2.5 flex items-center gap-1.5">
                      <a
                        href={whatsappUrlFor(lead.whatsapp || lead.phone, `Assalam-o-Alaikum ${lead.name}, this is 5STAR.M Estate & Builders — following up on your inquiry.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10 text-success"
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                      <a href={`tel:${lead.phone}`} className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary" title="Call">
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                      <select
                        value={lead.status}
                        disabled={isPending}
                        onChange={(e) => move(lead.id, e.target.value as LeadStatus)}
                        className="ml-auto flex-1 rounded-full border border-border bg-surface px-2 py-1 text-[11px] font-bold text-ink outline-none focus:border-primary"
                        aria-label={`Move ${lead.name} to a different status`}
                      >
                        {leadStatuses.map((s) => (
                          <option key={s} value={s}>
                            Move to {crmStatusLabel(s)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
