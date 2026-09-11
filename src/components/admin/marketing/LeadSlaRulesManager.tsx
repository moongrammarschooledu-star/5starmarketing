"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LeadSlaRule } from "@/lib/models/leadScoring";
import { scoreLevelLabels } from "@/lib/models/leadScoring";
import { updateSlaRuleAction } from "@/lib/actions/marketingAutomation.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function LeadSlaRulesManager({ rules }: { rules: LeadSlaRule[] }) {
  const [drafts, setDrafts] = useState<Record<string, number>>(Object.fromEntries(rules.map((r) => [r.scoreLevel, r.responseMinutes])));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function save(rule: LeadSlaRule) {
    startTransition(async () => {
      await updateSlaRuleAction(rule.scoreLevel, drafts[rule.scoreLevel] ?? rule.responseMinutes, rule.active);
      toast.show("SLA rule updated.");
      router.refresh();
    });
  }

  function toggleActive(rule: LeadSlaRule) {
    startTransition(async () => {
      await updateSlaRuleAction(rule.scoreLevel, rule.responseMinutes, !rule.active);
      toast.show(rule.active ? "SLA disabled." : "SLA enabled.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-heading text-base font-bold text-ink">Response SLA</h2>
      <p className="mt-1 text-xs text-muted">How quickly a lead at this level must receive a first real, logged contact before it&apos;s flagged as breached.</p>
      <div className="mt-4 space-y-2">
        {rules.map((rule) => (
          <div key={rule.scoreLevel} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted p-3 text-sm">
            <span className="font-semibold text-ink">{scoreLevelLabels[rule.scoreLevel]}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={drafts[rule.scoreLevel] ?? rule.responseMinutes}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [rule.scoreLevel]: Number(e.target.value) }))}
                className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-primary"
              />
              <span className="text-xs text-muted">minutes</span>
              <button type="button" onClick={() => save(rule)} disabled={isPending} className="rounded-full border-2 border-ink/15 px-3 py-1.5 text-[11px] font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
                Save
              </button>
              <button
                type="button"
                onClick={() => toggleActive(rule)}
                disabled={isPending}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${rule.active ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}
              >
                {rule.active ? "Active" : "Inactive"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
