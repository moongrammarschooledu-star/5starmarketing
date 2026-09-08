"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import type { Service } from "@/lib/models/service";
import { deleteServiceAction, toggleServiceEnabledAction } from "@/lib/actions/services.actions";
import { ConfirmDialog, useConfirmDelete } from "./ConfirmDialog";
import { useToast } from "./ToastProvider";
import { ServiceFormModal } from "./ServiceFormModal";

export function ServicesManager({ services }: { services: Service[] }) {
  const [editing, setEditing] = useState<Service | null | "new">(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const del = useConfirmDelete<Service>(async (id) => {
    await deleteServiceAction(id);
    toast.show("Service deleted.");
    router.refresh();
  });

  function toggleEnabled(id: string) {
    startTransition(async () => {
      await toggleServiceEnabledAction(id);
      toast.show("Service updated.");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Services</h1>
          <p className="mt-1 text-sm text-muted">Manage the services shown on the homepage.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <PlusCircle className="h-4 w-4" /> Add Service
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {services.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-ink">{s.title}</h3>
                <span
                  className={
                    s.enabled
                      ? "rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success"
                      : "rounded-full bg-muted/20 px-2 py-0.5 text-[10px] font-bold text-muted"
                  }
                >
                  {s.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p className="mt-1 line-clamp-1 text-sm text-muted">{s.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => toggleEnabled(s.id)}
                className="rounded-full border-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
              >
                {s.enabled ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(s)}
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink/15 text-ink hover:border-primary hover:text-primary"
                aria-label="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => del.open(s)}
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink/15 text-ink hover:border-primary hover:text-primary"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ServiceFormModal service={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={!!del.target}
        message="Are you sure you want to delete this service? This cannot be undone."
        confirmLabel="Delete Service"
        busy={del.busy}
        onConfirm={del.confirm}
        onClose={del.close}
      />
    </div>
  );
}
