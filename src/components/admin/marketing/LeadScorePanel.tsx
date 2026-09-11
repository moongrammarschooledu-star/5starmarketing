"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flame, Plus, X } from "lucide-react";
import type { Lead } from "@/lib/models/lead";
import type { LeadScoreHistoryEntry, ScoringEventType } from "@/lib/models/leadScoring";
import { scoreLevelLabels, manualNegativeScoringEvents } from "@/lib/models/leadScoring";
import type { MarketingTag } from "@/lib/models/marketingTag";
import { applyManualScoreEventAction, addTagToLeadAction, removeTagFromLeadAction } from "@/lib/actions/marketingAutomation.actions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useToast } from "@/components/admin/ToastProvider";

const NEGATIVE_LABELS: Record<string, string> = {
  INVALID_CONTACT: "Invalid Contact",
  UNREACHABLE: "Unreachable",
  NOT_INTERESTED: "Not Interested",
  DUPLICATE_LEAD: "Duplicate",
  SPAM: "Spam",
};

export function LeadScorePanel({ lead, history, allTags, leadTags }: { lead: Lead; history: LeadScoreHistoryEntry[]; allTags: MarketingTag[]; leadTags: MarketingTag[] }) {
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function applyNegative(eventType: ScoringEventType) {
    startTransition(async () => {
      await applyManualScoreEventAction(lead.id, eventType);
      toast.show(`"${NEGATIVE_LABELS[eventType]}" recorded.`);
      router.refresh();
    });
  }

  function addTag(tagId: string) {
    setShowTagPicker(false);
    startTransition(async () => {
      await addTagToLeadAction(lead.id, tagId);
      router.refresh();
    });
  }

  function removeTag(tagId: string) {
    startTransition(async () => {
      await removeTagFromLeadAction(lead.id, tagId);
      router.refresh();
    });
  }

  const availableTags = allTags.filter((t) => !leadTags.some((lt) => lt.id === t.id));

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <Flame className="h-4.5 w-4.5 text-primary" /> Lead Score
      </h2>
      <div className="mt-3 flex items-center gap-3">
        <span className="font-heading text-3xl font-extrabold text-ink">{lead.score}</span>
        <StatusBadge status={lead.scoreLevel} />
        {lead.autoPriority && lead.autoPriority !== lead.priority && <span className="text-xs text-muted">Suggested priority: {lead.autoPriority}</span>}
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tags</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {leadTags.map((t) => (
            <span key={t.id} className="flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink">
              {t.name}
              <button type="button" onClick={() => removeTag(t.id)} disabled={isPending} className="text-muted hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <div className="relative">
            <button type="button" onClick={() => setShowTagPicker((v) => !v)} className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-semibold text-muted hover:border-primary hover:text-primary">
              <Plus className="h-3 w-3" /> Add Tag
            </button>
            {showTagPicker && (
              <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
                {availableTags.length === 0 && <p className="p-2 text-xs text-muted">No more tags — create one under Marketing → Audience.</p>}
                {availableTags.map((t) => (
                  <button key={t.id} type="button" onClick={() => addTag(t.id)} className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs font-semibold text-ink hover:bg-surface-muted">
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Manual Actions</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {manualNegativeScoringEvents.map((event) => (
            <button
              key={event}
              type="button"
              onClick={() => applyNegative(event)}
              disabled={isPending}
              className="rounded-full border-2 border-primary/20 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/5 disabled:opacity-50"
            >
              {NEGATIVE_LABELS[event]}
            </button>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Score History</p>
          <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs">
                <span className="text-ink">{h.reason}</span>
                <span className={`font-bold ${h.points >= 0 ? "text-success" : "text-primary"}`}>
                  {h.points >= 0 ? "+" : ""}
                  {h.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">Score level thresholds: {scoreLevelLabels.WARM}/{scoreLevelLabels.HOT}/{scoreLevelLabels.VERY_HOT} are configurable under Settings → Marketing.</p>
    </div>
  );
}
