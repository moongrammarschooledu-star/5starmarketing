"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, CheckCircle2, Circle } from "lucide-react";
import { areaUnits, valuationMethods, type AreaUnit, type ValuationMethod } from "@/lib/models/investment";
import { findComparableCandidatesAction, createValuationAction } from "@/lib/actions/investment.actions";
import type { ComparableCandidate } from "@/services/propertyValuationService";
import { useToast } from "@/components/admin/ToastProvider";
import { formatPKR } from "@/lib/calculator";

interface PropertyOption {
  id: string;
  title: string;
  location: string;
  type: string;
}

const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function NewValuationForm({ properties }: { properties: PropertyOption[] }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [valuationMethod, setValuationMethod] = useState<ValuationMethod>("COMPARABLE_SALES");
  const [basePrice, setBasePrice] = useState("");
  const [area, setArea] = useState("");
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("Marla");
  const [rentalEstimateMonthly, setRentalEstimateMonthly] = useState("");
  const [marketAdjustmentPercent, setMarketAdjustmentPercent] = useState("");
  const [assumptions, setAssumptions] = useState("");

  const [candidates, setCandidates] = useState<ComparableCandidate[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isSearching, startSearching] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function findCandidates() {
    if (!propertyId) return;
    startSearching(async () => {
      try {
        const found = await findComparableCandidatesAction(propertyId);
        setCandidates(found);
        setSelected(new Set(found.map((_, i) => i).filter((i) => found[i].similarityScore >= 50)));
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not find comparables.");
      }
    });
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function submit() {
    if (!propertyId || !basePrice || !area) {
      toast.show("Please select a property and enter a base price and area.");
      return;
    }
    const chosen = candidates ? candidates.filter((_, i) => selected.has(i)) : [];
    startSaving(async () => {
      try {
        const valuation = await createValuationAction(
          {
            propertyId,
            valuationMethod,
            basePrice: Number(basePrice),
            area: Number(area),
            areaUnit,
            rentalEstimateMonthly: rentalEstimateMonthly ? Number(rentalEstimateMonthly) : undefined,
            marketAdjustmentPercent: marketAdjustmentPercent ? Number(marketAdjustmentPercent) : undefined,
            assumptions: assumptions || undefined,
          },
          chosen
        );
        toast.show("Valuation created.");
        router.push(`/admin/investment/valuation?created=${valuation.id}`);
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this valuation.");
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-heading text-lg font-bold text-ink">1. Property &amp; Valuation Inputs</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Property">
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inputClass}>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} — {p.location}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Valuation Method">
            <select value={valuationMethod} onChange={(e) => setValuationMethod(e.target.value as ValuationMethod)} className={inputClass}>
              {valuationMethods.map((m) => (
                <option key={m} value={m}>
                  {m.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Base Price (PKR)">
            <input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className={inputClass} placeholder="e.g. 25000000" />
          </Field>
          <Field label="Area">
            <div className="flex gap-2">
              <input type="number" value={area} onChange={(e) => setArea(e.target.value)} className={inputClass} placeholder="e.g. 10" />
              <select value={areaUnit} onChange={(e) => setAreaUnit(e.target.value as AreaUnit)} className={`${inputClass} w-28`}>
                {areaUnits.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="Rental Estimate / Month (optional)">
            <input type="number" value={rentalEstimateMonthly} onChange={(e) => setRentalEstimateMonthly(e.target.value)} className={inputClass} placeholder="e.g. 80000" />
          </Field>
          <Field label="Market Adjustment % (optional)">
            <input type="number" value={marketAdjustmentPercent} onChange={(e) => setMarketAdjustmentPercent(e.target.value)} className={inputClass} placeholder="e.g. 5" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Assumptions / Notes (optional)">
            <textarea value={assumptions} onChange={(e) => setAssumptions(e.target.value)} className={`${inputClass} min-h-20`} placeholder="Any assumptions behind this valuation, disclosed for transparency." />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-ink">2. Comparable Properties (Real Data Only)</h2>
          <button type="button" onClick={findCandidates} disabled={isSearching || !propertyId} className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold text-ink disabled:opacity-50">
            <Search className="h-3.5 w-3.5" /> {isSearching ? "Searching…" : "Find Comparable Candidates"}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">Sourced only from real properties (asking price) and completed deals (confirmed transaction). Approve the ones you want attached to this valuation.</p>

        {candidates && candidates.length === 0 && <p className="mt-4 text-sm text-muted">No comparable properties or transactions found for this property type/location yet.</p>}

        {candidates && candidates.length > 0 && (
          <div className="mt-4 divide-y divide-border">
            {candidates.map((c, i) => (
              <button key={i} type="button" onClick={() => toggle(i)} className="flex w-full items-center gap-3 py-3 text-left">
                {selected.has(i) ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : <Circle className="h-5 w-5 shrink-0 text-muted" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {c.title} {c.isTransaction ? <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">CONFIRMED TRANSACTION</span> : <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">ASKING</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {c.location ?? "—"} · {c.propertyType ?? "—"} · {formatPKR(c.price)} {c.pricePerSqft ? `· ${formatPKR(c.pricePerSqft)}/sqft` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold text-muted-foreground">{c.similarityScore}% match</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" onClick={submit} disabled={isSaving} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {isSaving ? "Creating Valuation…" : "Create Valuation"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
