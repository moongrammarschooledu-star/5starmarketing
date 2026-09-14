"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LegalChecklistTemplate, LegalChecklistTemplateItem, ChecklistTemplateType } from "@/lib/models/legal";
import { checklistTemplateTypes } from "@/lib/models/legal";
import { createChecklistTemplateAction, addChecklistItemAction, removeChecklistItemAction } from "@/lib/actions/legal.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function ChecklistTemplateManager({ templates, itemsByTemplate }: { templates: LegalChecklistTemplate[]; itemsByTemplate: Record<string, LegalChecklistTemplateItem[]> }) {
  const [name, setName] = useState("");
  const [templateType, setTemplateType] = useState<ChecklistTemplateType>("DUE_DILIGENCE");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemLabel, setItemLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function createTemplate() {
    if (!name.trim()) {
      toast.show("Please enter a template name.");
      return;
    }
    startTransition(async () => {
      try {
        await createChecklistTemplateAction({ name: name.trim(), templateType });
        toast.show("Template created.");
        setName("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this template.");
      }
    });
  }

  function addItem(templateId: string) {
    if (!itemLabel.trim()) {
      toast.show("Please enter an item label.");
      return;
    }
    startTransition(async () => {
      try {
        await addChecklistItemAction({ templateId, itemLabel: itemLabel.trim() });
        toast.show("Item added.");
        setItemLabel("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not add this item.");
      }
    });
  }

  function removeItem(id: string) {
    startTransition(async () => {
      try {
        await removeChecklistItemAction(id);
        toast.show("Item removed.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not remove this item.");
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        <select value={templateType} onChange={(e) => setTemplateType(e.target.value as ChecklistTemplateType)} className={inputClass}>
          {checklistTemplateTypes.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button type="button" onClick={createTemplate} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          New Template
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-surface p-4">
            <button type="button" onClick={() => setExpanded(expanded === t.id ? null : t.id)} className="flex w-full items-center justify-between text-left">
              <span className="text-sm font-bold text-ink">
                {t.name} <span className="text-xs font-normal text-muted">({t.templateType.replace(/_/g, " ")} · {t.itemCount ?? 0} items)</span>
              </span>
            </button>
            {expanded === t.id && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {(itemsByTemplate[t.id] ?? []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-1.5 text-sm">
                    <span>{item.itemLabel}</span>
                    <button type="button" disabled={isPending} onClick={() => removeItem(item.id)} className="text-xs font-bold text-primary hover:underline">
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input placeholder="New item label" value={itemLabel} onChange={(e) => setItemLabel(e.target.value)} className={`${inputClass} flex-1`} />
                  <button type="button" disabled={isPending} onClick={() => addItem(t.id)} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted">
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {templates.length === 0 && <p className="text-sm text-muted">No checklist templates yet.</p>}
      </div>
    </div>
  );
}
