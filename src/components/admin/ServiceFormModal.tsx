"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Service } from "@/lib/models/service";
import { serviceIconOptions } from "@/lib/models/service";
import { saveServiceAction, type ServiceFormState } from "@/lib/actions/services.actions";
import { Modal } from "./Modal";
import { useToast } from "./ToastProvider";

export function ServiceFormModal({
  service,
  onClose,
}: {
  service: Service | null | "new";
  onClose: () => void;
}) {
  const open = service !== null;
  const editing = service && service !== "new" ? service : undefined;
  const boundAction = saveServiceAction.bind(null, editing?.id ?? null);
  const [state, formAction, pending] = useActionState<ServiceFormState, FormData>(boundAction, {});
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (state?.success) {
      toast.show(editing ? "Service updated." : "Service created.");
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success]);

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Service" : "Add Service"}>
      {open && (
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">{state.error}</p>
          )}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Title *</span>
            <input
              type="text"
              name="title"
              required
              defaultValue={editing?.title}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Description</span>
            <textarea
              name="description"
              defaultValue={editing?.description}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Icon</span>
            <select
              name="icon"
              defaultValue={editing?.icon ?? serviceIconOptions[0]}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            >
              {serviceIconOptions.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </label>

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
              {pending ? "Saving..." : editing ? "Save Changes" : "Create Service"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
