"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Power, Trash2 } from "lucide-react";
import type { MarketingWorkflow, AutomationTriggerType } from "@/lib/models/automation";
import { automationTriggerTypes, activelyFiredTriggers } from "@/lib/models/automation";
import { createWorkflowAction, updateWorkflowAction, removeWorkflowAction } from "@/lib/actions/marketingAutomation.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { Modal } from "@/components/admin/Modal";

export function WorkflowListManager({ workflows }: { workflows: MarketingWorkflow[] }) {
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>("NEW_LEAD");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function create() {
    if (!name.trim()) {
      toast.show("Please enter a workflow name.");
      return;
    }
    setShowNew(false);
    startTransition(async () => {
      const workflow = await createWorkflowAction({ name: name.trim(), description: description.trim() || undefined, triggerType, conditions: [], active: false });
      toast.show("Workflow created — add actions before activating it.");
      setName("");
      setDescription("");
      router.push(`/admin/marketing/automation/workflows/${workflow.id}`);
    });
  }

  function toggleActive(workflow: MarketingWorkflow) {
    startTransition(async () => {
      await updateWorkflowAction(workflow.id, { active: !workflow.active });
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this workflow and all its actions?")) return;
    startTransition(async () => {
      await removeWorkflowAction(id);
      toast.show("Workflow deleted.");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{workflows.length} workflow(s)</p>
        <button type="button" onClick={() => setShowNew(true)} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> New Workflow
        </button>
      </div>

      <div className="mt-4 space-y-2.5">
        {workflows.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">No workflows yet — create one to get started.</p>}
        {workflows.map((w) => (
          <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
            <div className="min-w-0 flex-1">
              <Link href={`/admin/marketing/automation/workflows/${w.id}`} className="font-bold text-ink hover:text-primary">
                {w.name}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {w.triggerType}
                {!activelyFiredTriggers.includes(w.triggerType) && " — architecture only, not yet fired from a real event"}
                {w.conditions.length > 0 && ` · ${w.conditions.length} condition(s)`}
              </p>
              {w.description && <p className="mt-1 text-sm text-muted">{w.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleActive(w)}
                disabled={isPending}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${w.active ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}
              >
                <Power className="h-3.5 w-3.5" /> {w.active ? "Active" : "Paused"}
              </button>
              <button type="button" onClick={() => remove(w.id)} disabled={isPending} className="flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Workflow">
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Trigger</span>
            <select value={triggerType} onChange={(e) => setTriggerType(e.target.value as AutomationTriggerType)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
              {automationTriggerTypes.map((t) => (
                <option key={t} value={t}>
                  {t} {!activelyFiredTriggers.includes(t) ? "(architecture only)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setShowNew(false)} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink">
            Cancel
          </button>
          <button type="button" onClick={create} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Create &amp; Configure
          </button>
        </div>
      </Modal>
    </div>
  );
}
