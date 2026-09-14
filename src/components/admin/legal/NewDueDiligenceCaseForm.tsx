"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TransactionType, LegalChecklistTemplate } from "@/lib/models/legal";
import { transactionTypes } from "@/lib/models/legal";
import { createDueDiligenceCaseAction } from "@/lib/actions/legal.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function NewDueDiligenceCaseForm({ properties, templates, defaultPropertyId }: { properties: { id: string; title: string }[]; templates: LegalChecklistTemplate[]; defaultPropertyId?: string }) {
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? properties[0]?.id ?? "");
  const [transactionType, setTransactionType] = useState<TransactionType>("PURCHASE");
  const [checklistTemplateId, setChecklistTemplateId] = useState("");
  const [targetCompletionDate, setTargetCompletionDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function create() {
    if (!propertyId) {
      toast.show("Please choose a property.");
      return;
    }
    startTransition(async () => {
      try {
        const dd = await createDueDiligenceCaseAction({ propertyId, transactionType, checklistTemplateId: checklistTemplateId || undefined, targetCompletionDate: targetCompletionDate || undefined });
        toast.show("Due-diligence case opened.");
        router.push(`/admin/legal/due-diligence/${dd.id}`);
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not open this case.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-bold text-ink">Open Due-Diligence Case</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inputClass}>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <select value={transactionType} onChange={(e) => setTransactionType(e.target.value as TransactionType)} className={inputClass}>
          {transactionTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={checklistTemplateId} onChange={(e) => setChecklistTemplateId(e.target.value)} className={inputClass}>
          <option value="">No checklist template</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input type="date" value={targetCompletionDate} onChange={(e) => setTargetCompletionDate(e.target.value)} className={inputClass} />
      </div>
      <button type="button" onClick={create} disabled={isPending} className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
        Open Case
      </button>
    </div>
  );
}
