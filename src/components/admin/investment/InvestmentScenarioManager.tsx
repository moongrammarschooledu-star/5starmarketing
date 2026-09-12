"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { InvestmentScenario } from "@/lib/models/investment";
import { createScenarioAction, updateScenarioAction, removeScenarioAction } from "@/lib/actions/investment.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function InvestmentScenarioManager({ scenarios }: { scenarios: InvestmentScenario[] }) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function create() {
    if (!name.trim() || !rate) {
      toast.show("Please provide a scenario name and annual appreciation rate.");
      return;
    }
    startTransition(async () => {
      try {
        await createScenarioAction({ name: name.trim(), annualAppreciationRate: Number(rate), isDefault: false, sortOrder: scenarios.length * 10 + 10, active: true });
        toast.show("Scenario created.");
        setName("");
        setRate("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this scenario.");
      }
    });
  }

  function updateRate(id: string, value: string) {
    startTransition(async () => {
      try {
        await updateScenarioAction(id, { annualAppreciationRate: Number(value) });
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this scenario.");
      }
    });
  }

  function toggleActive(scenario: InvestmentScenario) {
    startTransition(async () => {
      await updateScenarioAction(scenario.id, { active: !scenario.active });
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this scenario? It will no longer be selectable for new calculations.")) return;
    startTransition(async () => {
      try {
        await removeScenarioAction(id);
        toast.show("Scenario deleted.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not delete this scenario.");
      }
    });
  }

  return (
    <section className="max-w-2xl rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-heading text-base font-bold text-ink">Appreciation Scenarios</h2>
      <p className="mt-1 text-xs text-muted">Conservative / Base / Optimistic annual appreciation rates used across appreciation projections and ROI calculators. These are estimates the admin sets — never a guaranteed return.</p>

      <div className="mt-4 space-y-2">
        {scenarios.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <span className="flex-1 text-sm font-semibold text-ink">{s.name}</span>
            <input type="number" defaultValue={s.annualAppreciationRate} onBlur={(e) => e.target.value !== String(s.annualAppreciationRate) && updateRate(s.id, e.target.value)} className={`${inputClass} w-24`} />
            <span className="text-xs text-muted">% / year</span>
            <button type="button" onClick={() => toggleActive(s)} disabled={isPending} className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
              {s.active ? "Active" : "Inactive"}
            </button>
            <button type="button" onClick={() => remove(s.id)} disabled={isPending} className="text-muted hover:text-primary">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {scenarios.length === 0 && <p className="text-sm text-muted">No scenarios yet.</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Scenario name (e.g. Aggressive)" className={`${inputClass} flex-1`} />
        <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Rate %" className={`${inputClass} w-28`} />
        <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> Add Scenario
        </button>
      </div>
    </section>
  );
}
