"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/models/project";
import { projectStatuses } from "@/lib/models/project";
import { saveProjectAction, type ProjectFormState } from "@/lib/actions/projects.actions";
import { Modal } from "./Modal";
import { ImageUploader } from "./ImageUploader";
import { useToast } from "./ToastProvider";

export function ProjectFormModal({
  project,
  onClose,
}: {
  project: Project | null | "new";
  onClose: () => void;
}) {
  const open = project !== null;
  const editing = project && project !== "new" ? project : undefined;
  const boundAction = saveProjectAction.bind(null, editing?.id ?? null);
  const [state, formAction, pending] = useActionState<ProjectFormState, FormData>(boundAction, {});
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (state?.success) {
      toast.show(editing ? "Project updated." : "Project created.");
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success]);

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Project" : "Add Project"}>
      {open && (
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">{state.error}</p>
          )}

          <Field label="Project Name" name="name" required defaultValue={editing?.name} />
          <Field label="Location" name="location" required defaultValue={editing?.location} />
          <Field label="Type" name="type" required defaultValue={editing?.type} placeholder="Residential, Commercial..." />

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Status</span>
            <select
              name="status"
              defaultValue={editing?.status ?? "Upcoming"}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            >
              {projectStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-ink">Project Images</span>
            <ImageUploader name="images" initialImages={editing?.images} />
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
              {pending ? "Saving..." : editing ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
      />
    </label>
  );
}
