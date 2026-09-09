"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { WhatsAppTemplate } from "@/lib/models/whatsapp";
import { saveTemplateAction, type TemplateFormState } from "@/lib/actions/whatsapp.actions";
import { Modal } from "./Modal";
import { useToast } from "./ToastProvider";

const VARIABLES = ["customer_name", "property_name", "location", "price", "size", "agent_name"];

export function TemplateFormModal({
  template,
  onClose,
}: {
  template: WhatsAppTemplate | null | "new";
  onClose: () => void;
}) {
  const open = template !== null;
  const editing = template && template !== "new" ? template : undefined;
  const boundAction = saveTemplateAction.bind(null, editing?.id ?? null);
  const [state, formAction, pending] = useActionState<TemplateFormState, FormData>(boundAction, {});
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (state?.success) {
      toast.show(editing ? "Template updated." : "Template created.");
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success]);

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Template" : "Add Template"}>
      {open && (
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">{state.error}</p>
          )}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Template Name *</span>
            <input
              type="text"
              name="name"
              required
              defaultValue={editing?.name}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Message *</span>
            <textarea
              name="content"
              required
              rows={6}
              defaultValue={editing?.content}
              className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>

          <div className="rounded-lg bg-surface-muted p-3 text-xs text-muted">
            <span className="font-semibold text-ink">Available variables:</span>{" "}
            {VARIABLES.map((v) => (
              <code key={v} className="mr-1.5 rounded bg-surface px-1.5 py-0.5 font-mono text-primary">
                {`{{${v}}}`}
              </code>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-ink/30"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {pending ? "Saving..." : editing ? "Save Changes" : "Create Template"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
