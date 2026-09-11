"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save } from "lucide-react";
import type { MarketingWorkflow, WorkflowAction, WorkflowCondition, AutomationActionType, ConditionOperator } from "@/lib/models/automation";
import { automationActionTypes } from "@/lib/models/automation";
import { leadStatuses, leadPriorities } from "@/lib/models/lead";
import type { MarketingTag } from "@/lib/models/marketingTag";
import { updateWorkflowAction, addWorkflowActionAction, removeWorkflowActionAction } from "@/lib/actions/marketingAutomation.actions";
import { useToast } from "@/components/admin/ToastProvider";

const CONDITION_FIELDS = ["scoreLevel", "score", "status", "newStatus", "source", "leadType", "priority", "budgetMin", "budgetMax"];
const OPERATORS: ConditionOperator[] = ["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"];

export function WorkflowDetailEditor({ workflow, actions, tags, agents }: { workflow: MarketingWorkflow; actions: WorkflowAction[]; tags: MarketingTag[]; agents: { id: string; name: string }[] }) {
  const [conditions, setConditions] = useState<WorkflowCondition[]>(workflow.conditions);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function saveConditions() {
    startTransition(async () => {
      await updateWorkflowAction(workflow.id, { conditions });
      toast.show("Conditions saved.");
      router.refresh();
    });
  }

  function addCondition() {
    setConditions((prev) => [...prev, { field: CONDITION_FIELDS[0], operator: "eq", value: "" }]);
  }

  function updateCondition(i: number, patch: Partial<WorkflowCondition>) {
    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function removeCondition(i: number) {
    setConditions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function removeAction(id: string) {
    startTransition(async () => {
      await removeWorkflowActionAction(id, workflow.id);
      toast.show("Action removed.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-bold text-ink">Conditions</h2>
          <button type="button" onClick={addCondition} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
            <Plus className="h-3.5 w-3.5" /> Add Condition
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">All conditions must pass (AND). No conditions means the workflow always runs on this trigger.</p>
        <div className="mt-4 space-y-2">
          {conditions.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-2 rounded-lg border border-border p-2.5">
              <select value={c.field} onChange={(e) => updateCondition(i, { field: e.target.value })} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary">
                {CONDITION_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <select value={c.operator} onChange={(e) => updateCondition(i, { operator: e.target.value as ConditionOperator })} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary">
                {OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="value (comma-separated for 'in')"
                value={Array.isArray(c.value) ? c.value.join(",") : String(c.value)}
                onChange={(e) => updateCondition(i, { value: c.operator === "in" ? e.target.value.split(",").map((s) => s.trim()) : e.target.value })}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary"
              />
              <button type="button" onClick={() => removeCondition(i)} className="text-xs font-bold text-primary">
                Remove
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={saveConditions} disabled={isPending} className="mt-4 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          <Save className="h-3.5 w-3.5" /> Save Conditions
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Actions</h2>
        <p className="mt-1 text-xs text-muted">Run in order, top to bottom.</p>
        <div className="mt-4 space-y-2">
          {actions.length === 0 && <p className="text-sm text-muted">No actions yet — add one below.</p>}
          {actions.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted p-3 text-sm">
              <div>
                <p className="font-semibold text-ink">{a.actionType}</p>
                <p className="text-xs text-muted-foreground">{JSON.stringify(a.actionConfig)}</p>
              </div>
              <button type="button" onClick={() => removeAction(a.id)} disabled={isPending} className="flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <AddActionForm workflowId={workflow.id} sortOrder={actions.length} tags={tags} agents={agents} />
      </div>
    </div>
  );
}

function AddActionForm({ workflowId, sortOrder, tags, agents }: { workflowId: string; sortOrder: number; tags: MarketingTag[]; agents: { id: string; name: string }[] }) {
  const [actionType, setActionType] = useState<AutomationActionType>("CREATE_FOLLOWUP");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  // Field values for every possible config shape — only the relevant
  // ones are read when building action_config for the chosen type.
  const [delayMinutes, setDelayMinutes] = useState("15");
  const [followUpType, setFollowUpType] = useState("Call");
  const [note, setNote] = useState("");
  const [agentId, setAgentId] = useState("");
  const [priority, setPriority] = useState<(typeof leadPriorities)[number]>("Medium");
  const [tagId, setTagId] = useState(tags[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<(typeof leadStatuses)[number]>("Contacted");

  function add() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let actionConfig: Record<string, any> = {};
    switch (actionType) {
      case "CREATE_TASK":
      case "CREATE_FOLLOWUP":
        actionConfig = { delayMinutes: Number(delayMinutes), type: followUpType, note };
        break;
      case "ASSIGN_AGENT":
        actionConfig = agentId === "auto" ? { strategy: "least_assigned" } : { agentId };
        break;
      case "CHANGE_PRIORITY":
        actionConfig = { priority };
        break;
      case "ADD_TAG":
      case "REMOVE_TAG":
        actionConfig = { tagId };
        break;
      case "CREATE_NOTIFICATION":
        actionConfig = { title, message };
        break;
      case "UPDATE_STATUS":
        actionConfig = { status };
        break;
      default:
        actionConfig = {};
    }
    startTransition(async () => {
      await addWorkflowActionAction(workflowId, { actionType, actionConfig, sortOrder });
      toast.show("Action added.");
      router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-dashed border-border p-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink">Action Type</span>
        <select value={actionType} onChange={(e) => setActionType(e.target.value as AutomationActionType)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
          {automationActionTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      {(actionType === "CREATE_TASK" || actionType === "CREATE_FOLLOWUP") && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Delay (minutes)</span>
            <input type="number" value={delayMinutes} onChange={(e) => setDelayMinutes(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Type</span>
            <select value={followUpType} onChange={(e) => setFollowUpType(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
              {["Call", "WhatsApp", "Meeting", "Site Visit", "Other"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Note</span>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
        </div>
      )}

      {actionType === "ASSIGN_AGENT" && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Agent</span>
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
            <option value="auto">Auto — least assigned agent</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {actionType === "CHANGE_PRIORITY" && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as (typeof leadPriorities)[number])} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
            {leadPriorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      )}

      {(actionType === "ADD_TAG" || actionType === "REMOVE_TAG") && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Tag</span>
          {tags.length === 0 ? (
            <p className="text-xs text-muted">No tags exist yet — create one under Marketing → Audience.</p>
          ) : (
            <select value={tagId} onChange={(e) => setTagId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </label>
      )}

      {actionType === "CREATE_NOTIFICATION" && (
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Title</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Message</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Use {{customer_name}}, {{score}}, {{score_level}}, {{property_title}}, {{source}}" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
        </div>
      )}

      {actionType === "UPDATE_STATUS" && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">New Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as (typeof leadStatuses)[number])} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
            {leadStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      )}

      {(actionType === "SEND_EMAIL" || actionType === "SEND_WHATSAPP" || actionType === "SEND_SMS") && (
        <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700">
          No {actionType === "SEND_EMAIL" ? "email" : actionType === "SEND_WHATSAPP" ? "WhatsApp Business API" : "SMS"} provider is configured in this deployment — this
          action will be logged as Skipped, never falsely marked as sent, until real credentials are added.
        </p>
      )}

      <button type="button" onClick={add} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
        <Plus className="h-3.5 w-3.5" /> Add Action
      </button>
    </div>
  );
}
