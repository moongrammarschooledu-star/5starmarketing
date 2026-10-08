"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteDemandAction, setDemandStatusAction } from "@/lib/actions/demands.actions";
import { demandStatuses, type DemandStatus } from "@/lib/models/demand";
import { useToast } from "./ToastProvider";

export function DemandStatusControl({ id, status }: { id: string; status: DemandStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function change(next: DemandStatus) {
    startTransition(async () => {
      const res = await setDemandStatusAction(id, next);
      if (!res.ok) toast.show(res.error ?? "Could not change the status.");
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Delete this demand? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deleteDemandAction(id);
      if (!res.ok) {
        toast.show(res.error ?? "Could not delete this demand.");
        return;
      }
      router.push("/admin/demands");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={status}
        disabled={pending}
        onChange={(e) => change(e.target.value as DemandStatus)}
        aria-label="Demand status"
        className="rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-bold text-ink outline-none focus:border-primary disabled:opacity-60"
      >
        {demandStatuses.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-bold text-muted hover:border-primary hover:text-primary disabled:opacity-60"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </div>
  );
}
