"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import type { WhatsAppTemplate } from "@/lib/models/whatsapp";
import { deleteTemplateAction } from "@/lib/actions/whatsapp.actions";
import { ConfirmDialog, useConfirmDelete } from "./ConfirmDialog";
import { useToast } from "./ToastProvider";
import { TemplateFormModal } from "./TemplateFormModal";

export function WhatsAppTemplatesManager({ templates }: { templates: WhatsAppTemplate[] }) {
  const [editing, setEditing] = useState<WhatsAppTemplate | null | "new">(null);
  const router = useRouter();
  const toast = useToast();

  const del = useConfirmDelete<WhatsAppTemplate>(async (id) => {
    await deleteTemplateAction(id);
    toast.show("Template deleted.");
    router.refresh();
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Quick Message Templates</h1>
          <p className="mt-1 text-sm text-muted">
            Reusable WhatsApp messages with variables — used from the WhatsApp preview on each lead.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <PlusCircle className="h-4 w-4" /> Add Template
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {templates.map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-ink">{t.name}</h3>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(t)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink/15 text-ink hover:border-primary hover:text-primary"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => del.open(t)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink/15 text-ink hover:border-primary hover:text-primary"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-muted">{t.content}</p>
          </div>
        ))}
        {templates.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
            No templates yet — add one to speed up how your team replies on WhatsApp.
          </p>
        )}
      </div>

      <TemplateFormModal template={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={!!del.target}
        message="Are you sure you want to delete this template? This cannot be undone."
        confirmLabel="Delete Template"
        busy={del.busy}
        onConfirm={del.confirm}
        onClose={del.close}
      />
    </div>
  );
}
