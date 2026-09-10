"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, UserPlus, CalendarClock, Trash2 } from "lucide-react";
import type { Lead, LeadStatus, LeadPropertyInfo } from "@/lib/models/lead";
import { leadStatuses } from "@/lib/models/lead";
import type { WhatsAppTemplate } from "@/lib/models/whatsapp";
import {
  updateLeadStatusAction,
  updateLeadFollowUpAction,
  assignLeadToAgentAction,
  assignLeadToMeAction,
  deleteLeadAction,
} from "@/lib/actions/leads.actions";
import { useToast } from "./ToastProvider";
import { ConfirmDialog } from "./ConfirmDialog";
import { WhatsAppMessageModal } from "./WhatsAppMessageModal";

export function LeadActionsPanel({
  lead,
  property,
  templates,
  whatsappNumber,
  agentName,
  assignableAgents = [],
  canAssign = true,
  canDelete = true,
}: {
  lead: Lead;
  property?: LeadPropertyInfo;
  templates: WhatsAppTemplate[];
  whatsappNumber: string;
  agentName: string;
  /** Who can be picked in "Assign Agent" — admin/manager view only. */
  assignableAgents?: { id: string; name: string }[];
  /** Sales Manager/Admin/Super Admin can reassign; a sales_agent cannot. */
  canAssign?: boolean;
  canDelete?: boolean;
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [followUpDate, setFollowUpDate] = useState(lead.nextFollowUpDate ?? "");
  const [followUpTime, setFollowUpTime] = useState(lead.nextFollowUpTime ?? "");
  const [agentId, setAgentId] = useState(lead.assignedAgentId ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function saveStatus(next: LeadStatus) {
    setStatus(next);
    startTransition(async () => {
      await updateLeadStatusAction(lead.id, next);
      toast.show("Status updated.");
      router.refresh();
    });
  }

  function saveFollowUp() {
    startTransition(async () => {
      await updateLeadFollowUpAction(lead.id, followUpDate || null, followUpTime || null);
      toast.show("Follow-up saved.");
      router.refresh();
    });
  }

  function saveAssignment() {
    const agent = assignableAgents.find((a) => a.id === agentId);
    startTransition(async () => {
      await assignLeadToAgentAction(lead.id, agent?.id ?? null, agent?.name ?? null);
      toast.show(agent ? `Assigned to ${agent.name}.` : "Lead unassigned.");
      router.refresh();
    });
  }

  function assignToMe() {
    startTransition(async () => {
      await assignLeadToMeAction(lead.id);
      toast.show("Assigned to you.");
      router.refresh();
    });
  }

  async function confirmDelete() {
    setConfirmingDelete(false);
    await deleteLeadAction(lead.id);
    toast.show("Lead deleted.");
    router.push("/admin/leads");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-heading text-sm font-bold text-ink">Contact Customer</h3>
        <div className="mt-3 grid grid-cols-1 gap-2.5">
          <WhatsAppMessageModal
            lead={lead}
            property={property}
            templates={templates}
            whatsappNumber={whatsappNumber}
            agentName={agentName}
          />
          <a
            href={`tel:${lead.phone}`}
            className="flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink"
          >
            <Phone className="h-4 w-4" /> Call
          </a>
          <a
            href={lead.email ? `mailto:${lead.email}` : undefined}
            className="flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink"
            style={{ pointerEvents: lead.email ? "auto" : "none", opacity: lead.email ? 1 : 0.5 }}
          >
            <Mail className="h-4 w-4" /> Email
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-heading text-sm font-bold text-ink">Status</h3>
        <select
          value={status}
          disabled={isPending}
          onChange={(e) => saveStatus(e.target.value as LeadStatus)}
          className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-primary"
        >
          {leadStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
          <CalendarClock className="h-4.5 w-4.5 text-primary" /> Follow-Up
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <input
            type="time"
            value={followUpTime}
            onChange={(e) => setFollowUpTime(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          onClick={saveFollowUp}
          disabled={isPending}
          className="mt-3 w-full rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
        >
          Save Follow-Up
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
          <UserPlus className="h-4.5 w-4.5 text-primary" /> Assigned Agent
        </h3>
        {canAssign ? (
          <>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              disabled={isPending}
              className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-primary"
            >
              <option value="">Unassigned</option>
              {assignableAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={saveAssignment}
                disabled={isPending}
                className="rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={assignToMe}
                disabled={isPending}
                className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                Assign to Me
              </button>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm font-semibold text-ink">{lead.assignedTo || "Unassigned"}</p>
        )}
      </div>

      {canDelete && (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary/30 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5"
        >
          <Trash2 className="h-4 w-4" /> Delete Lead
        </button>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        message="Are you sure you want to delete this lead? This cannot be undone."
        confirmLabel="Delete Lead"
        onConfirm={confirmDelete}
        onClose={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
