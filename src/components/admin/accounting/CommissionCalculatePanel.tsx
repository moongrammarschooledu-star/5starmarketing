"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calculator } from "lucide-react";
import type { CommissionRule } from "@/lib/models/accounting";
import { calculateCommissionAction } from "@/lib/actions/accounting.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function CommissionCalculatePanel({
  eligibleDeals,
  rules,
}: {
  eligibleDeals: { id: string; dealNumber: string; agentName?: string; finalAmount: number }[];
  rules: CommissionRule[];
}) {
  const [dealId, setDealId] = useState("");
  const [ruleId, setRuleId] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function calculate() {
    if (!dealId || !ruleId) {
      toast.show("Please select a deal and a commission rule.");
      return;
    }
    startTransition(async () => {
      try {
        await calculateCommissionAction(dealId, ruleId);
        toast.show("Commission calculated.");
        setDealId("");
        setRuleId("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not calculate this commission.");
      }
    });
  }

  if (eligibleDeals.length === 0) return null;

  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
        <Calculator className="h-4 w-4 text-primary" /> Calculate a Commission
      </h2>
      <p className="mt-1 text-xs text-muted">A rule is never auto-assumed — choose which one applies to this deal.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={dealId} onChange={(e) => setDealId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
          <option value="">Select a deal...</option>
          {eligibleDeals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.dealNumber} {d.agentName ? `— ${d.agentName}` : ""}
            </option>
          ))}
        </select>
        <select value={ruleId} onChange={(e) => setRuleId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
          <option value="">Select a rule...</option>
          {rules.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={calculate} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          {isPending ? "Calculating..." : "Calculate"}
        </button>
      </div>
    </div>
  );
}
