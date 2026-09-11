"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Power, Save } from "lucide-react";
import type { MarketingTemplate, MarketingTemplateChannel, MarketingTemplateCategory } from "@/lib/models/marketingTemplate";
import { marketingTemplateCategories, MARKETING_TEMPLATE_VARIABLES } from "@/lib/models/marketingTemplate";
import { createMarketingTemplateAction, updateMarketingTemplateAction, duplicateMarketingTemplateAction, setMarketingTemplateActiveAction } from "@/lib/actions/marketingAutomation.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function MarketingTemplateManager({ templates, channel }: { templates: MarketingTemplate[]; channel: MarketingTemplateChannel }) {
  const [selected, setSelected] = useState<MarketingTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<MarketingTemplateCategory>("Other");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function select(t: MarketingTemplate | null) {
    setCreating(false);
    setSelected(t);
    setName(t?.name ?? "");
    setCategory(t?.category ?? "Other");
    setSubject(t?.subject ?? "");
    setContent(t?.content ?? "");
  }

  function startCreate() {
    setSelected(null);
    setCreating(true);
    setName("");
    setCategory("Other");
    setSubject("");
    setContent("");
  }

  function save() {
    if (!name.trim()) {
      toast.show("Please enter a template name.");
      return;
    }
    startTransition(async () => {
      try {
        if (creating) {
          const t = await createMarketingTemplateAction({ name, channel, category, subject: channel === "Email" ? subject : undefined, content });
          toast.show("Template created.");
          select(t);
        } else if (selected) {
          await updateMarketingTemplateAction(selected.id, { name, category, subject: channel === "Email" ? subject : undefined, content });
          toast.show("Template saved.");
        }
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not save this template.");
      }
    });
  }

  function duplicate(t: MarketingTemplate) {
    startTransition(async () => {
      const copy = await duplicateMarketingTemplateAction(t.id);
      toast.show("Template duplicated.");
      router.refresh();
      select(copy);
    });
  }

  function toggleActive(t: MarketingTemplate) {
    startTransition(async () => {
      await setMarketingTemplateActiveAction(t.id, !t.active);
      toast.show(t.active ? "Deactivated." : "Activated.");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <button type="button" onClick={startCreate} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> New {channel} Template
        </button>
        <div className="mt-3 space-y-2">
          {templates.length === 0 && <p className="text-sm text-muted">No {channel} templates yet.</p>}
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => select(t)}
              className={`block w-full rounded-xl border p-3 text-left text-sm ${selected?.id === t.id ? "border-primary bg-primary/5" : "border-border bg-surface"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">{t.name}</span>
                {!t.active && <span className="rounded-full bg-muted/20 px-2 py-0.5 text-[10px] font-bold text-muted">Inactive</span>}
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {t.category} · v{t.version}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {!selected && !creating ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">Select a template to edit, or create a new one.</div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-ink">Name</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-ink">Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value as MarketingTemplateCategory)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
                  {marketingTemplateCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {channel === "Email" && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-ink">Subject</span>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
              </label>
            )}

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Content</span>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} placeholder="Write the message here, using {{variables}} for real data..." className="rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-xs text-ink outline-none focus:border-primary" />
            </label>

            <div className="rounded-lg bg-surface-muted p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Available Variables</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MARKETING_TEMPLATE_VARIABLES.map((v) => (
                  <button key={v} type="button" onClick={() => setContent((c) => c + v)} className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-mono text-primary hover:bg-primary/10">
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button type="button" onClick={save} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                <Save className="h-4 w-4" /> Save Template
              </button>
              {selected && (
                <>
                  <button type="button" onClick={() => duplicate(selected)} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
                    <Copy className="h-4 w-4" /> Duplicate
                  </button>
                  <button type="button" onClick={() => toggleActive(selected)} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
                    <Power className="h-4 w-4" /> {selected.active ? "Deactivate" : "Activate"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
