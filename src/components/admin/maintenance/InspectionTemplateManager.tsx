"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { checklistCategories, type ChecklistCategory, type InspectionTemplate, type InspectionChecklistItemDef } from "@/lib/models/maintenance";
import { createTemplateAction, addTemplateItemAction, removeTemplateItemAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function InspectionTemplateManager({ templates }: { templates: (InspectionTemplate & { items: InspectionChecklistItemDef[] })[] }) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function createTemplate() {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await createTemplateAction({ name: name.trim() });
        setName("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this template.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-heading text-base font-bold text-ink">Inspection Checklist Templates</h2>
      <p className="mt-1 text-xs text-muted">Every new inspection instantiates its checklist from a template. Edit items below.</p>

      <div className="mt-4 space-y-3">
        {templates.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New template name" className={`${inputClass} flex-1`} />
        <button type="button" onClick={createTemplate} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> Add Template
        </button>
      </div>
    </section>
  );
}

function TemplateCard({ template }: { template: InspectionTemplate & { items: InspectionChecklistItemDef[] } }) {
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState<ChecklistCategory>("Other");
  const [item, setItem] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function addItem() {
    if (!item.trim()) return;
    startTransition(async () => {
      try {
        await addTemplateItemAction(template.id, { category, item: item.trim(), required: true, sortOrder: (template.items.length + 1) * 10 });
        setItem("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not add this item.");
      }
    });
  }

  function removeItem(id: string) {
    startTransition(async () => {
      await removeTemplateItemAction(id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border p-3.5">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-bold text-ink">
          {template.name} <span className="font-normal text-muted">({template.items.length} items)</span>
        </span>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {template.items.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs">
              <span className="text-muted">
                {i.category} — {i.item}
              </span>
              <button type="button" onClick={() => removeItem(i.id)} disabled={isPending} className="text-muted hover:text-primary">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value as ChecklistCategory)} className={inputClass}>
              {checklistCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Item label" className={`${inputClass} min-w-[160px] flex-1`} />
            <button type="button" onClick={addItem} disabled={isPending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
