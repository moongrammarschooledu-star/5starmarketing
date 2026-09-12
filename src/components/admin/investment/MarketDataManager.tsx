"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { MarketData, MarketDataInput, MarketDataStatus } from "@/lib/models/investment";
import { createMarketDataAction, setMarketDataStatusAction } from "@/lib/actions/investment.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { formatPKR } from "@/lib/calculator";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

const STATUS_STYLE: Record<MarketDataStatus, string> = {
  DRAFT: "bg-amber-100 text-amber-800",
  VERIFIED: "bg-green-100 text-green-800",
  ARCHIVED: "bg-gray-100 text-gray-600",
};

const STATUS_FLOW: Record<MarketDataStatus, MarketDataStatus | null> = {
  DRAFT: "VERIFIED",
  VERIFIED: "ARCHIVED",
  ARCHIVED: null,
};

export function MarketDataManager({ records, canManage }: { records: MarketData[]; canManage: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<MarketDataInput>>({ dataDate: new Date().toISOString().slice(0, 10) });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof MarketDataInput>(key: K, value: MarketDataInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.location?.trim() || !form.dataDate) {
      toast.show("Please provide at least a location and data date.");
      return;
    }
    startTransition(async () => {
      try {
        await createMarketDataAction(form as MarketDataInput);
        toast.show("Market data record created as DRAFT.");
        setForm({ dataDate: new Date().toISOString().slice(0, 10) });
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this record.");
      }
    });
  }

  function advanceStatus(id: string, current: MarketDataStatus) {
    const next = STATUS_FLOW[current];
    if (!next) return;
    startTransition(async () => {
      try {
        await setMarketDataStatusAction(id, next);
        toast.show(`Marked as ${next}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this record's status.");
      }
    });
  }

  return (
    <div>
      {canManage && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
            <span className="font-heading text-base font-bold text-ink">Add Market Data Record</span>
            {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
          </button>
          {showForm && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Location *">
                  <input value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} className={inputClass} placeholder="e.g. DHA Phase 6, Lahore" />
                </Field>
                <Field label="Property Type">
                  <input value={form.propertyType ?? ""} onChange={(e) => set("propertyType", e.target.value)} className={inputClass} placeholder="e.g. House, Plot, Apartment" />
                </Field>
                <Field label="Data Date *">
                  <input type="date" value={form.dataDate ?? ""} onChange={(e) => set("dataDate", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Period">
                  <div className="flex gap-2">
                    <input type="date" value={form.periodStart ?? ""} onChange={(e) => set("periodStart", e.target.value)} className={inputClass} />
                    <input type="date" value={form.periodEnd ?? ""} onChange={(e) => set("periodEnd", e.target.value)} className={inputClass} />
                  </div>
                </Field>
                <Field label="Average Price">
                  <input type="number" value={form.averagePrice ?? ""} onChange={(e) => set("averagePrice", e.target.value ? Number(e.target.value) : undefined)} className={inputClass} />
                </Field>
                <Field label="Min / Max Price">
                  <div className="flex gap-2">
                    <input type="number" value={form.minPrice ?? ""} onChange={(e) => set("minPrice", e.target.value ? Number(e.target.value) : undefined)} className={inputClass} placeholder="Min" />
                    <input type="number" value={form.maxPrice ?? ""} onChange={(e) => set("maxPrice", e.target.value ? Number(e.target.value) : undefined)} className={inputClass} placeholder="Max" />
                  </div>
                </Field>
                <Field label="Price per Marla">
                  <input type="number" value={form.pricePerMarla ?? ""} onChange={(e) => set("pricePerMarla", e.target.value ? Number(e.target.value) : undefined)} className={inputClass} />
                </Field>
                <Field label="Price per Sqft">
                  <input type="number" value={form.pricePerSqft ?? ""} onChange={(e) => set("pricePerSqft", e.target.value ? Number(e.target.value) : undefined)} className={inputClass} />
                </Field>
                <Field label="Average Rent">
                  <input type="number" value={form.averageRent ?? ""} onChange={(e) => set("averageRent", e.target.value ? Number(e.target.value) : undefined)} className={inputClass} />
                </Field>
                <Field label="Rental Yield %">
                  <input type="number" value={form.rentalYield ?? ""} onChange={(e) => set("rentalYield", e.target.value ? Number(e.target.value) : undefined)} className={inputClass} />
                </Field>
                <Field label="Appreciation Rate % (annual)">
                  <input type="number" value={form.appreciationRate ?? ""} onChange={(e) => set("appreciationRate", e.target.value ? Number(e.target.value) : undefined)} className={inputClass} />
                </Field>
                <Field label="Data Source">
                  <input value={form.dataSource ?? ""} onChange={(e) => set("dataSource", e.target.value)} className={inputClass} placeholder="e.g. Zameen.com, internal survey" />
                </Field>
                <Field label="Source URL">
                  <input value={form.sourceUrl ?? ""} onChange={(e) => set("sourceUrl", e.target.value)} className={inputClass} />
                </Field>
              </div>
              <Field label="Notes">
                <textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className={`${inputClass} min-h-16`} />
              </Field>
              <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" /> Save as Draft
              </button>
              <p className="text-xs text-muted">New records start as DRAFT and must be marked VERIFIED before they feed official valuations or public figures.</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Avg. Price</th>
              <th className="px-4 py-3">Price/Marla</th>
              <th className="px-4 py-3">Rental Yield</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              {canManage && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{r.location}</td>
                <td className="px-4 py-3 text-muted">{r.propertyType ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{r.averagePrice != null ? formatPKR(r.averagePrice) : "—"}</td>
                <td className="px-4 py-3 text-muted">{r.pricePerMarla != null ? formatPKR(r.pricePerMarla) : "—"}</td>
                <td className="px-4 py-3 text-muted">{r.rentalYield != null ? `${r.rentalYield}%` : "—"}</td>
                <td className="px-4 py-3 text-muted">{new Date(r.dataDate).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    {STATUS_FLOW[r.status] && (
                      <button type="button" onClick={() => advanceStatus(r.id, r.status)} disabled={isPending} className="text-xs font-bold text-primary hover:underline disabled:opacity-50">
                        Mark {STATUS_FLOW[r.status]}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={canManage ? 8 : 7} className="px-4 py-10 text-center text-sm text-muted">
                  No market data records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
