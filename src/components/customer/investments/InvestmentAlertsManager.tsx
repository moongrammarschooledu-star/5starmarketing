"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Trash2 } from "lucide-react";
import type { InvestmentAlert, InvestmentAlertType } from "@/lib/models/investment";
import { setAlertActiveAction, removeAlertAction } from "@/lib/actions/investment.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function InvestmentAlertsManager({ alerts }: { alerts: InvestmentAlert[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function toggle(id: string, active: boolean) {
    startTransition(async () => {
      await setAlertActiveAction(id, active);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this alert?")) return;
    startTransition(async () => {
      await removeAlertAction(id);
      toast.show("Alert deleted.");
      router.refresh();
    });
  }

  if (alerts.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">No investment alerts set up yet.</div>;
  }

  return (
    <div className="space-y-2.5">
      {alerts.map((a) => (
        <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5">
          <div className="flex items-center gap-2.5">
            <Bell className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-ink">
                {describeAlert(a.alertType, a.thresholdValue)} — {a.propertyTitle || a.projectName || "Any property"}
              </p>
              {a.lastTriggeredAt && <p className="text-xs text-muted">Last triggered {new Date(a.lastTriggeredAt).toLocaleDateString("en-GB")}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <input type="checkbox" checked={a.active} onChange={(e) => toggle(a.id, e.target.checked)} disabled={isPending} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
              Active
            </label>
            <button type="button" onClick={() => remove(a.id)} disabled={isPending} className="text-primary hover:text-primary-hover">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function describeAlert(type: InvestmentAlertType, threshold?: number): string {
  switch (type) {
    case "PRICE_BELOW":
      return `Price falls below ${threshold ?? "—"}`;
    case "YIELD_ABOVE":
      return `Rental yield exceeds ${threshold ?? "—"}%`;
    case "ROI_ABOVE":
      return `Estimated ROI exceeds ${threshold ?? "—"}%`;
    case "AVAILABILITY":
      return "Property becomes available";
    case "INVENTORY_CHANGE":
      return "Project inventory changes";
    case "PRICE_CHANGE":
      return "Price changes";
    default:
      return type;
  }
}
