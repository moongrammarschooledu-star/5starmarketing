"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, Mail, UserPlus, CalendarClock, Trash2 } from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/models/lead";
import { leadStatuses } from "@/lib/models/lead";
import {
  updateLeadStatusAction,
  updateLeadFollowUpAction,
  assignLeadAction,
  assignLeadToMeAction,
  deleteLeadAction,
} from "@/lib/actions/leads.actions";
import { whatsappLink } from "@/lib/site";
import { useToast } from "./ToastProvider";
import { ConfirmDialog } from "./ConfirmDialog";

export function LeadActionsPanel({ lead }: { lead: Lead }) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [followUpDate, setFollowUpDate] = useState(lead.nextFollowUpDate ?? "");
  const [followUpTime, setFollowUpTime] = useState(lead.nextFollowUpTime ?? "");
  const [assignedTo, setAssignedTo] = useState(lead.assignedTo ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const whatsappNumber = (lead.whatsapp || lead.phone || "").replace(/[^0-9+]/g, "");
  const inquiryMessage = `Assalam-o-Alaikum ${lead.name},\n\nThank you for your interest${
    lead.propertyTitle ? ` in ${lead.propertyTitle}` : ""
  }. This is 5STAR.M Estate & Builders — how can we help you today?`;

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
    startTransition(async () => {
      await assignLeadAction(lead.id, assignedTo.trim() || null);
      toast.show("Lead assigned.");
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
          <a
            href={whatsappLink(inquiryMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-bold text-white"
            style={{ pointerEvents: whatsappNumber ? "auto" : "none", opacity: whatsappNumber ? 1 : 0.5 }}
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
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
          <UserPlus className="h-4.5 w-4.5 text-primary" /> Assigned To
        </h3>
        <input
          type="text"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          placeholder="Staff member name"
          className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
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
      </div>

      <button
        type="button"
        onClick={() => setConfirmingDelete(true)}
        className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary/30 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5"
      >
        <Trash2 className="h-4 w-4" /> Delete Lead
      </button>

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
