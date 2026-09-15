"use client";

import { useState, useTransition } from "react";
import { createAiAutomationRuleAction, setAiAutomationRuleEnabledAction } from "@/lib/actions/ai.actions";
import type { AiAutomationRule, AiAutomationRun, AutomationTrigger, AutomationAction } from "@/lib/models/ai";

const TRIGGERS: AutomationTrigger[] = [
  "NEW_LEAD", "LEAD_INACTIVE", "NEW_INQUIRY", "RENT_OVERDUE", "LEASE_EXPIRY",
  "SUPPORT_TICKET_CREATED", "SLA_RISK", "CONSTRUCTION_DELAY", "MAINTENANCE_REQUEST",
  "PAYMENT_RECEIVED", "DOCUMENT_EXPIRY",
];
const ACTIONS: AutomationAction[] = ["CREATE_TASK", "CREATE_NOTIFICATION", "SUGGEST_DRAFT", "ASSIGN_QUEUE", "REQUEST_HUMAN_REVIEW"];

export function AutomationsPanel({
  initialRules,
  initialRuns,
  readOnly,
}: {
  initialRules: AiAutomationRule[];
  initialRuns: AiAutomationRun[];
  readOnly: boolean;
}) {
  const [rules, setRules] = useState(initialRules);
  const runCount = initialRuns.length;
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<AutomationTrigger>("NEW_LEAD");
  const [action, setAction] = useState<AutomationAction>("REQUEST_HUMAN_REVIEW");
  const [pending, startTransition] = useTransition();

  function create() {
    if (!name.trim()) return;
    startTransition(async () => {
      const rule = await createAiAutomationRuleAction({
        name,
        description: null,
        triggerType: trigger,
        conditions: {},
        actionType: action,
        actionConfig: {},
        requiresApproval: true,
        isEnabled: true,
      });
      setRules((prev) => [rule, ...prev]);
      setName("");
    });
  }

  function toggle(rule: AiAutomationRule) {
    startTransition(async () => {
      await setAiAutomationRuleEnabledAction(rule.id, !rule.isEnabled);
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isEnabled: !r.isEnabled } : r)));
    });
  }

  return (
    <div className="mt-6">
      {!readOnly && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="font-heading text-base font-bold text-ink">New rule</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select value={trigger} onChange={(e) => setTrigger(e.target.value as AutomationTrigger)} className="rounded-lg border border-border px-3 py-2 text-sm">
              {TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <select value={action} onChange={(e) => setAction(e.target.value as AutomationAction)} className="rounded-lg border border-border px-3 py-2 text-sm">
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <button onClick={create} disabled={pending} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              Create rule
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">{runCount} automation run(s) recorded so far.</p>

      <div className="mt-4 space-y-3">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
            <div>
              <p className="font-heading text-sm font-bold text-ink">{r.name}</p>
              <p className="text-xs text-muted">
                {r.triggerType.replace(/_/g, " ")} → {r.actionType.replace(/_/g, " ")} {r.requiresApproval ? "(requires approval)" : ""}
              </p>
            </div>
            {!readOnly && (
              <button
                onClick={() => toggle(r)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${r.isEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
              >
                {r.isEnabled ? "Enabled" : "Disabled"}
              </button>
            )}
          </div>
        ))}
        {rules.length === 0 && <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted">No automation rules yet.</p>}
      </div>
    </div>
  );
}
