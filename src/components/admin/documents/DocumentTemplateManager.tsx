"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Power, Save } from "lucide-react";
import type { DocumentTemplate, DocumentType } from "@/lib/models/document";
import { TEMPLATE_VARIABLES } from "@/lib/models/document";
import { createDocumentTemplateAction, updateDocumentTemplateAction, duplicateDocumentTemplateAction, setDocumentTemplateActiveAction } from "@/lib/actions/documents.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function DocumentTemplateManager({ templates, types }: { templates: DocumentTemplate[]; types: DocumentType[] }) {
  const [selected, setSelected] = useState<DocumentTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [documentType, setDocumentType] = useState(types[0]?.code ?? "OTHER");
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function selectTemplate(t: DocumentTemplate | null) {
    setCreating(false);
    setSelected(t);
    setName(t?.name ?? "");
    setDocumentType(t?.documentType ?? types[0]?.code ?? "OTHER");
    setContent(t?.content ?? "");
  }

  function startCreate() {
    setSelected(null);
    setCreating(true);
    setName("");
    setDocumentType(types[0]?.code ?? "OTHER");
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
          const t = await createDocumentTemplateAction({ name, documentType, content });
          toast.show("Template created.");
          selectTemplate(t);
        } else if (selected) {
          await updateDocumentTemplateAction(selected.id, { name, documentType, content });
          toast.show("Template saved.");
        }
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not save this template.");
      }
    });
  }

  function duplicate(t: DocumentTemplate) {
    startTransition(async () => {
      const copy = await duplicateDocumentTemplateAction(t.id);
      toast.show("Template duplicated.");
      router.refresh();
      selectTemplate(copy);
    });
  }

  function toggleActive(t: DocumentTemplate) {
    startTransition(async () => {
      await setDocumentTemplateActiveAction(t.id, !t.active);
      toast.show(t.active ? "Deactivated." : "Activated.");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <button type="button" onClick={startCreate} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> New Template
        </button>
        <div className="mt-3 space-y-2">
          {templates.length === 0 && <p className="text-sm text-muted">No templates yet.</p>}
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTemplate(t)}
              className={`block w-full rounded-xl border p-3 text-left text-sm ${selected?.id === t.id ? "border-primary bg-primary/5" : "border-border bg-surface"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">{t.name}</span>
                {!t.active && <span className="rounded-full bg-muted/20 px-2 py-0.5 text-[10px] font-bold text-muted">Inactive</span>}
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {t.documentType} · v{t.version}
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
                <span className="font-semibold text-ink">Document Type</span>
                <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
                  {types.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Content</span>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} placeholder="Write the agreement terms here, using {{variables}} for real data..." className="rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-xs text-ink outline-none focus:border-primary" />
            </label>

            <div className="rounded-lg bg-surface-muted p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Available Variables</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TEMPLATE_VARIABLES.map((v) => (
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
