"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Power, Save } from "lucide-react";
import type { CommissionRule, CommissionBasis, CommissionConditionType } from "@/lib/models/accounting";
import { commissionBases, commissionConditionTypes } from "@/lib/models/accounting";
import { createCommissionRuleAction, updateCommissionRuleAction, setCommissionRuleActiveAction } from "@/lib/actions/accounting.actions";
import { useToast } from "@/components/admin/ToastProvider";

interface TierDraft {
  minAmount: string;
  maxAmount: string;
  rate: string;
}
interface ConditionDraft {
  conditionType: CommissionConditionType;
  conditionValue: string;
}

export function CommissionRuleManager({ rules }: { rules: CommissionRule[] }) {
  const [selected, setSelected] = useState<CommissionRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [basis, setBasis] = useState<CommissionBasis>("DEAL_AMOUNT");
  const [rate, setRate] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [priority, setPriority] = useState("100");
  const [tiers, setTiers] = useState<TierDraft[]>([]);
  const [conditions, setConditions] = useState<ConditionDraft[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function select(r: CommissionRule | null) {
    setCreating(false);
    setSelected(r);
    setName(r?.name ?? "");
    setBasis(r?.basis ?? "DEAL_AMOUNT");
    setRate(r?.rate != null ? String(r.rate) : "");
    setFixedAmount(r?.fixedAmount != null ? String(r.fixedAmount) : "");
    setPriority(r ? String(r.priority) : "100");
    setTiers((r?.tiers ?? []).map((t) => ({ minAmount: String(t.minAmount), maxAmount: t.maxAmount != null ? String(t.maxAmount) : "", rate: String(t.rate) })));
    setConditions((r?.conditions ?? []).map((c) => ({ conditionType: c.conditionType, conditionValue: c.conditionValue })));
  }

  function startCreate() {
    setSelected(null);
    setCreating(true);
    setName("");
    setBasis("DEAL_AMOUNT");
    setRate("");
    setFixedAmount("");
    setPriority("100");
    setTiers([]);
    setConditions([]);
  }

  function save() {
    if (!name.trim()) {
      toast.show("Please enter a rule name.");
      return;
    }
    const input = {
      name: name.trim(),
      basis,
      rate: rate ? Number(rate) : undefined,
      fixedAmount: fixedAmount ? Number(fixedAmount) : undefined,
      priority: Number(priority) || 100,
      tiers: basis === "TIERED" ? tiers.map((t) => ({ minAmount: Number(t.minAmount) || 0, maxAmount: t.maxAmount ? Number(t.maxAmount) : undefined, rate: Number(t.rate) || 0 })) : undefined,
      conditions: conditions.filter((c) => c.conditionValue.trim()).map((c) => ({ conditionType: c.conditionType, conditionValue: c.conditionValue.trim() })),
    };
    startTransition(async () => {
      try {
        if (creating) {
          const rule = await createCommissionRuleAction(input);
          toast.show("Commission rule created.");
          select(rule);
        } else if (selected) {
          await updateCommissionRuleAction(selected.id, input);
          toast.show("Commission rule saved.");
        }
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not save this rule.");
      }
    });
  }

  function toggleActive(r: CommissionRule) {
    startTransition(async () => {
      await setCommissionRuleActiveAction(r.id, !r.active);
      toast.show(r.active ? "Deactivated." : "Activated.");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <button type="button" onClick={startCreate} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> New Commission Rule
        </button>
        <div className="mt-3 space-y-2">
          {rules.length === 0 && <p className="text-sm text-muted">No commission rules yet.</p>}
          {rules.map((r) => (
            <button key={r.id} type="button" onClick={() => select(r)} className={`block w-full rounded-xl border p-3 text-left text-sm ${selected?.id === r.id ? "border-primary bg-primary/5" : "border-border bg-surface"}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">{r.name}</span>
                {!r.active && <span className="rounded-full bg-muted/20 px-2 py-0.5 text-[10px] font-bold text-muted">Inactive</span>}
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {r.basis.replace(/_/g, " ")} · Priority {r.priority}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {!selected && !creating ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">Select a rule to edit, or create a new one.</div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-ink">Name</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-ink">Basis</span>
                <select value={basis} onChange={(e) => setBasis(e.target.value as CommissionBasis)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
                  {commissionBases.map((b) => (
                    <option key={b} value={b}>
                      {b.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {(basis === "DEAL_AMOUNT" || basis === "COLLECTED_AMOUNT") && (
              <label className="flex max-w-xs flex-col gap-1.5 text-sm">
                <span className="font-semibold text-ink">Rate (%)</span>
                <input type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
              </label>
            )}
            {basis === "FIXED" && (
              <label className="flex max-w-xs flex-col gap-1.5 text-sm">
                <span className="font-semibold text-ink">Fixed Amount (PKR)</span>
                <input type="number" min="0" step="0.01" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
              </label>
            )}
            {basis === "TIERED" && (
              <div>
                <span className="text-sm font-semibold text-ink">Tiers (applied to the deal amount bracket it falls in)</span>
                <div className="mt-2 space-y-2">
                  {tiers.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="number" placeholder="Min" value={t.minAmount} onChange={(e) => setTiers((prev) => prev.map((x, idx) => (idx === i ? { ...x, minAmount: e.target.value } : x)))} className="w-28 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-ink outline-none focus:border-primary" />
                      <input type="number" placeholder="Max (blank = ∞)" value={t.maxAmount} onChange={(e) => setTiers((prev) => prev.map((x, idx) => (idx === i ? { ...x, maxAmount: e.target.value } : x)))} className="w-32 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-ink outline-none focus:border-primary" />
                      <input type="number" placeholder="Rate %" value={t.rate} onChange={(e) => setTiers((prev) => prev.map((x, idx) => (idx === i ? { ...x, rate: e.target.value } : x)))} className="w-24 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-ink outline-none focus:border-primary" />
                      <button type="button" onClick={() => setTiers((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs font-bold text-primary">
                        Remove
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setTiers((prev) => [...prev, { minAmount: "", maxAmount: "", rate: "" }])} className="text-xs font-bold text-primary hover:underline">
                    + Add Tier
                  </button>
                </div>
              </div>
            )}

            <label className="flex max-w-xs flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Priority (lower tried first)</span>
              <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
            </label>

            <div>
              <span className="text-sm font-semibold text-ink">Conditions (all must match; none = applies to every deal)</span>
              <div className="mt-2 space-y-2">
                {conditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select value={c.conditionType} onChange={(e) => setConditions((prev) => prev.map((x, idx) => (idx === i ? { ...x, conditionType: e.target.value as CommissionConditionType } : x)))} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-ink outline-none focus:border-primary">
                      {commissionConditionTypes.map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <input type="text" placeholder="Value (ID or exact label)" value={c.conditionValue} onChange={(e) => setConditions((prev) => prev.map((x, idx) => (idx === i ? { ...x, conditionValue: e.target.value } : x)))} className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-ink outline-none focus:border-primary" />
                    <button type="button" onClick={() => setConditions((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs font-bold text-primary">
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setConditions((prev) => [...prev, { conditionType: "PROPERTY_TYPE", conditionValue: "" }])} className="text-xs font-bold text-primary hover:underline">
                  + Add Condition
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button type="button" onClick={save} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                <Save className="h-4 w-4" /> Save Rule
              </button>
              {selected && (
                <button type="button" onClick={() => toggleActive(selected)} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
                  <Power className="h-4 w-4" /> {selected.active ? "Deactivate" : "Activate"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
