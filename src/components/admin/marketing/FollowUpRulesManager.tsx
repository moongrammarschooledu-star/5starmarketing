"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { FollowUpRule, FollowUpTriggerEvent } from "@/lib/models/automation";
import { followUpTriggerEvents } from "@/lib/models/automation";
import { followUpTypes } from "@/lib/models/team";
import { createFollowUpRuleAction, updateFollowUpRuleAction, removeFollowUpRuleAction } from "@/lib/actions/marketingAutomation.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { Modal } from "@/components/admin/Modal";

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round((minutes / 60) * 10) / 10} hr`;
  return `${Math.round((minutes / 1440) * 10) / 10} day(s)`;
}

export function FollowUpRulesManager({ rules }: { rules: FollowUpRule[] }) {
  const [showNew, setShowNew] = useState(false);
  const [triggerEvent, setTriggerEvent] = useState<FollowUpTriggerEvent>("LEAD_CREATED");
  const [delayMinutes, setDelayMinutes] = useState("15");
  const [followUpType, setFollowUpType] = useState<FollowUpRule["followUpType"]>("Call");
  const [noteTemplate, setNoteTemplate] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const grouped = followUpTriggerEvents.map((event) => ({ event, rules: rules.filter((r) => r.triggerEvent === event) })).filter((g) => g.rules.length > 0);

  function create() {
    if (!noteTemplate.trim()) {
      toast.show("Please enter a note template.");
      return;
    }
    setShowNew(false);
    startTransition(async () => {
      await createFollowUpRuleAction({ triggerEvent, delayMinutes: Number(delayMinutes), followUpType, noteTemplate: noteTemplate.trim(), active: true, sortOrder: 0 });
      toast.show("Follow-up rule created.");
      setNoteTemplate("");
      router.refresh();
    });
  }

  function toggleActive(rule: FollowUpRule) {
    startTransition(async () => {
      await updateFollowUpRuleAction(rule.id, { active: !rule.active });
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeFollowUpRuleAction(id);
      toast.show("Rule removed.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-base font-bold text-ink">Follow-Up Scheduling Rules</h2>
          <p className="mt-1 text-xs text-muted">Every active rule for an event is pre-scheduled at once; completing any one cancels the rest of that cascade.</p>
        </div>
        <button type="button" onClick={() => setShowNew(true)} className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> Add Rule
        </button>
      </div>

      {grouped.length === 0 && <p className="mt-4 text-sm text-muted">No follow-up rules yet.</p>}

      <div className="mt-4 space-y-4">
        {grouped.map(({ event, rules: eventRules }) => (
          <div key={event}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{event.replace(/_/g, " ")}</p>
            <div className="mt-2 space-y-2">
              {eventRules.map((rule) => (
                <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">
                      {rule.followUpType} after {formatMinutes(rule.delayMinutes)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{rule.noteTemplate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(rule)}
                      disabled={isPending}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${rule.active ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}
                    >
                      {rule.active ? "Active" : "Inactive"}
                    </button>
                    <button type="button" onClick={() => remove(rule.id)} disabled={isPending} className="flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Follow-Up Rule">
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Trigger Event</span>
            <select value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value as FollowUpTriggerEvent)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
              {followUpTriggerEvents.map((e) => (
                <option key={e} value={e}>
                  {e.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Delay (minutes)</span>
              <input type="number" min={0} value={delayMinutes} onChange={(e) => setDelayMinutes(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Type</span>
              <select value={followUpType} onChange={(e) => setFollowUpType(e.target.value as FollowUpRule["followUpType"])} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
                {followUpTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Note Template</span>
            <textarea value={noteTemplate} onChange={(e) => setNoteTemplate(e.target.value)} rows={2} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setShowNew(false)} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink">
            Cancel
          </button>
          <button type="button" onClick={create} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Create
          </button>
        </div>
      </Modal>
    </div>
  );
}
