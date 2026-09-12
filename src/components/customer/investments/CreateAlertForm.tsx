"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { InvestmentAlertType } from "@/lib/models/investment";
import { investmentAlertTypes } from "@/lib/models/investment";
import { createAlertAction } from "@/lib/actions/investment.actions";
import { useToast } from "@/components/admin/ToastProvider";

const THRESHOLD_TYPES: InvestmentAlertType[] = ["PRICE_BELOW", "YIELD_ABOVE", "ROI_ABOVE"];

export function CreateAlertForm({ properties }: { properties: { id: string; title: string }[] }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [alertType, setAlertType] = useState<InvestmentAlertType>("PRICE_BELOW");
  const [threshold, setThreshold] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function create() {
    startTransition(async () => {
      try {
        await createAlertAction({ propertyId: propertyId || undefined, projectId: undefined, alertType, thresholdValue: THRESHOLD_TYPES.includes(alertType) ? Number(threshold) : undefined });
        toast.show("Alert created.");
        setThreshold("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this alert.");
      }
    });
  }

  if (properties.length === 0) {
    return <p className="text-sm text-muted">Save an investment analysis for a property first, then set alerts for it here.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      <select value={alertType} onChange={(e) => setAlertType(e.target.value as InvestmentAlertType)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
        {investmentAlertTypes.map((t) => (
          <option key={t} value={t}>
            {t.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {THRESHOLD_TYPES.includes(alertType) && <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="Threshold" className="w-28 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />}
      <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
        <Plus className="h-3.5 w-3.5" /> Create Alert
      </button>
    </div>
  );
}
