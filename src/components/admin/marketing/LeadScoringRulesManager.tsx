"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { LeadScoringRule } from "@/lib/models/leadScoring";
import { updateScoringRuleAction } from "@/lib/actions/marketingAutomation.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function LeadScoringRulesManager({ rules }: { rules: LeadScoringRule[] }) {
  const [drafts, setDrafts] = useState<Record<string, number>>(Object.fromEntries(rules.map((r) => [r.id, r.points])));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function save(rule: LeadScoringRule) {
    startTransition(async () => {
      await updateScoringRuleAction(rule.id, { points: drafts[rule.id] });
      toast.show("Scoring rule updated.");
      router.refresh();
    });
  }

  function toggleActive(rule: LeadScoringRule) {
    startTransition(async () => {
      await updateScoringRuleAction(rule.id, { active: !rule.active });
      toast.show(rule.active ? "Rule deactivated." : "Rule activated.");
      router.refresh();
    });
  }

  const positive = rules.filter((r) => r.points >= 0);
  const negative = rules.filter((r) => r.points < 0);

  return (
    <div className="space-y-6">
      <RuleTable title="Positive Signals" rules={positive} drafts={drafts} setDrafts={setDrafts} save={save} toggleActive={toggleActive} isPending={isPending} />
      <RuleTable title="Negative Signals (applied manually from a lead's page)" rules={negative} drafts={drafts} setDrafts={setDrafts} save={save} toggleActive={toggleActive} isPending={isPending} />
    </div>
  );
}

function RuleTable({
  title,
  rules,
  drafts,
  setDrafts,
  save,
  toggleActive,
  isPending,
}: {
  title: string;
  rules: LeadScoringRule[];
  drafts: Record<string, number>;
  setDrafts: (updater: (prev: Record<string, number>) => Record<string, number>) => void;
  save: (rule: LeadScoringRule) => void;
  toggleActive: (rule: LeadScoringRule) => void;
  isPending: boolean;
}) {
  if (rules.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-heading text-base font-bold text-ink">{title}</h2>
      <div className="mt-4 space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted p-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{rule.label}</p>
              <p className="text-xs text-muted-foreground">{rule.eventType}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={drafts[rule.id] ?? rule.points}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [rule.id]: Number(e.target.value) }))}
                className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-primary"
              />
              <button type="button" onClick={() => save(rule)} disabled={isPending} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-primary hover:border-primary disabled:opacity-50">
                <Save className="h-3.5 w-3.5" />
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
