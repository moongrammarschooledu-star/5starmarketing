"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag, Target } from "lucide-react";
import type { Lead, LeadPriority, LeadType, LeadPurpose } from "@/lib/models/lead";
import { leadPriorities, leadTypes, leadPurposes } from "@/lib/models/lead";
import { setLeadPriorityAction, setLeadTypeAction, updateLeadRequirementsAction } from "@/lib/actions/crm.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function LeadCrmDetailsPanel({ lead }: { lead: Lead }) {
  const [priority, setPriority] = useState<LeadPriority>(lead.priority);
  const [leadType, setLeadType] = useState<LeadType>(lead.leadType);
  const [purpose, setPurpose] = useState<LeadPurpose | "">(lead.purpose ?? "");
  const [budgetMin, setBudgetMin] = useState(lead.budgetMin?.toString() ?? "");
  const [budgetMax, setBudgetMax] = useState(lead.budgetMax?.toString() ?? "");
  const [preferredLocation, setPreferredLocation] = useState(lead.preferredLocation ?? "");
  const [preferredPropertyType, setPreferredPropertyType] = useState(lead.preferredPropertyType ?? "");
  const [preferredBedrooms, setPreferredBedrooms] = useState(lead.preferredBedrooms?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function savePriority(next: LeadPriority) {
    setPriority(next);
    startTransition(async () => {
      await setLeadPriorityAction(lead.id, next);
      toast.show("Priority updated.");
      router.refresh();
    });
  }

  function saveLeadType(next: LeadType) {
    setLeadType(next);
    startTransition(async () => {
      await setLeadTypeAction(lead.id, next);
      toast.show("Lead type updated.");
      router.refresh();
    });
  }

  function saveRequirements() {
    setError(null);
    startTransition(async () => {
      try {
        await updateLeadRequirementsAction(lead.id, {
          purpose: purpose || undefined,
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          preferredLocation: preferredLocation || undefined,
          preferredPropertyType: preferredPropertyType || undefined,
          preferredBedrooms: preferredBedrooms ? Number(preferredBedrooms) : undefined,
        });
        toast.show("Requirements saved.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save requirements.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <Target className="h-4.5 w-4.5 text-primary" /> CRM Details
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Priority</span>
          <select
            value={priority}
            disabled={isPending}
            onChange={(e) => savePriority(e.target.value as LeadPriority)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-primary"
          >
            {leadPriorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Lead Type</span>
          <select
            value={leadType}
            disabled={isPending}
            onChange={(e) => saveLeadType(e.target.value as LeadType)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-primary"
          >
            {leadTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 border-t border-border pt-5">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Tag className="h-3.5 w-3.5" /> Customer Requirements
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Purpose</span>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as LeadPurpose | "")}
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
            >
              <option value="">Not set</option>
              {leadPurposes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Preferred Bedrooms</span>
            <input
              type="number"
              min={0}
              value={preferredBedrooms}
              onChange={(e) => setPreferredBedrooms(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Budget Min (Rs.)</span>
            <input
              type="number"
              min={0}
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Budget Max (Rs.)</span>
            <input
              type="number"
              min={0}
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-semibold text-ink">Preferred Location</span>
            <input
              type="text"
              value={preferredLocation}
              onChange={(e) => setPreferredLocation(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-semibold text-ink">Preferred Property Type</span>
            <input
              type="text"
              value={preferredPropertyType}
              onChange={(e) => setPreferredPropertyType(e.target.value)}
              placeholder="e.g. House, Flat, Commercial Property"
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
        </div>

        {error && <p className="mt-2 text-xs font-semibold text-primary">{error}</p>}

        <button
          type="button"
          onClick={saveRequirements}
          disabled={isPending}
          className="mt-3 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
        >
          Save Requirements
        </button>
      </div>
    </div>
  );
}
