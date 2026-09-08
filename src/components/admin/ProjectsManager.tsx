"use client";

import { useState } from "react";
import Image from "next/image";
import { PlusCircle, Pencil, Trash2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/models/project";
import { deleteProjectAction } from "@/lib/actions/projects.actions";
import { StatusBadge } from "./StatusBadge";
import { ConfirmDialog, useConfirmDelete } from "./ConfirmDialog";
import { useToast } from "./ToastProvider";
import { ProjectFormModal } from "./ProjectFormModal";

export function ProjectsManager({ projects }: { projects: Project[] }) {
  const [editing, setEditing] = useState<Project | null | "new">(null);
  const router = useRouter();
  const toast = useToast();

  const del = useConfirmDelete<Project>(async (id) => {
    await deleteProjectAction(id);
    toast.show("Project deleted.");
    router.refresh();
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Projects</h1>
          <p className="mt-1 text-sm text-muted">Manage your project portfolio.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <PlusCircle className="h-4 w-4" /> Add Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border py-16 text-center text-muted">
          No projects yet. Click &quot;Add Project&quot; to create one.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
              <div className="relative aspect-[16/10] w-full">
                <Image src={p.images[0]} alt={p.name} fill sizes="360px" className="object-cover" unoptimized={p.images[0]?.startsWith("data:")} />
                <span className="absolute left-3 top-3">
                  <StatusBadge status={p.status} />
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-heading text-sm font-bold text-ink">{p.name}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> {p.location} · {p.type}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => del.open(p)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink/15 text-ink hover:border-primary hover:text-primary"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProjectFormModal project={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={!!del.target}
        message="Are you sure you want to delete this project? This cannot be undone."
        confirmLabel="Delete Project"
        busy={del.busy}
        onConfirm={del.confirm}
        onClose={del.close}
      />
    </div>
  );
}
