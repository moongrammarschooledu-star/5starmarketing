"use client";

import Image from "next/image";
import Link from "next/link";
import { PlusCircle, Pencil, Trash2, MapPin, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/models/project";
import { deleteProjectAction, toggleProjectPublishedAction } from "@/lib/actions/projects.actions";
import { StatusBadge } from "./StatusBadge";
import { ConfirmDialog, useConfirmDelete } from "./ConfirmDialog";
import { useToast } from "./ToastProvider";

export function ProjectsManager({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const toast = useToast();

  const del = useConfirmDelete<Project>(async (id) => {
    await deleteProjectAction(id);
    toast.show("Project deleted.");
    router.refresh();
  });

  async function togglePublished(id: string) {
    await toggleProjectPublishedAction(id);
    toast.show("Project updated.");
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Projects</h1>
          <p className="mt-1 text-sm text-muted">Manage your project portfolio.</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <PlusCircle className="h-4 w-4" /> Add Project
        </Link>
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
                <Image
                  src={p.coverImage || p.images[0]}
                  alt={p.name}
                  fill
                  sizes="360px"
                  className="object-cover"
                  unoptimized={(p.coverImage || p.images[0])?.startsWith("data:")}
                />
                <span className="absolute left-3 top-3 flex gap-1.5">
                  <StatusBadge status={p.status} />
                  {!p.published && (
                    <span className="rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-bold text-white">Draft</span>
                  )}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-heading text-sm font-bold text-ink">{p.name}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> {p.location} · {p.type}
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/admin/projects/${p.id}/edit`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => togglePublished(p.id)}
                    title={p.published ? "Unpublish" : "Publish"}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink/15 text-ink hover:border-primary hover:text-primary"
                  >
                    {p.published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
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
