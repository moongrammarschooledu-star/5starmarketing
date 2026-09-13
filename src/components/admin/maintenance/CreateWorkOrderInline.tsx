"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { MaintenancePriority } from "@/lib/models/maintenance";
import { createWorkOrderAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function CreateWorkOrderInline({ requestId, propertyId, unitId, priority, description }: { requestId: string; propertyId: string; unitId?: string; priority: MaintenancePriority; description: string }) {
  const [show, setShow] = useState(false);
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function create() {
    startTransition(async () => {
      try {
        const wo = await createWorkOrderAction({ maintenanceRequestId: requestId, propertyId, unitId, priority, description, scopeOfWork: scopeOfWork || undefined });
        toast.show("Work order created.");
        router.push(`/admin/maintenance/work-orders/${wo.id}`);
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this work order.");
      }
    });
  }

  if (!show) {
    return (
      <button type="button" onClick={() => setShow(true)} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
        <Plus className="h-3.5 w-3.5" /> Create Work Order
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <textarea value={scopeOfWork} onChange={(e) => setScopeOfWork(e.target.value)} placeholder="Scope of work (optional)" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={create} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          {isPending ? "Creating..." : "Create Work Order"}
        </button>
        <button type="button" onClick={() => setShow(false)} className="rounded-full px-4 py-2 text-xs font-bold text-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
