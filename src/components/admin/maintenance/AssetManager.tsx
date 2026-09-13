"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { MaintenanceAsset, MaintenanceAssetInput, AssetStatus } from "@/lib/models/maintenance";
import { createAssetAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

const STATUS_STYLE: Record<AssetStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  UNDER_MAINTENANCE: "bg-amber-100 text-amber-800",
  OUT_OF_SERVICE: "bg-red-100 text-red-800",
  RETIRED: "bg-gray-100 text-gray-600",
};

export function AssetManager({ assets, properties, vendors, canManage }: { assets: MaintenanceAsset[]; properties: { id: string; title: string }[]; vendors: { id: string; businessName: string }[]; canManage: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<MaintenanceAssetInput>>({ propertyId: properties[0]?.id });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof MaintenanceAssetInput>(key: K, value: MaintenanceAssetInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.category?.trim()) {
      toast.show("Please enter a category (e.g. AC Unit, Generator).");
      return;
    }
    startTransition(async () => {
      try {
        await createAssetAction(form as MaintenanceAssetInput);
        toast.show("Asset created.");
        setForm({ propertyId: properties[0]?.id });
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this asset.");
      }
    });
  }

  return (
    <div>
      {canManage && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
            <span className="font-heading text-base font-bold text-ink">Add Asset</span>
            {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
          </button>
          {showForm && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Property">
                  <select value={form.propertyId ?? ""} onChange={(e) => set("propertyId", e.target.value)} className={inputClass}>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Category *">
                  <input value={form.category ?? ""} onChange={(e) => set("category", e.target.value)} className={inputClass} placeholder="e.g. AC Unit, Generator, Elevator" />
                </Field>
                <Field label="Location">
                  <input value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} className={inputClass} placeholder="e.g. Roof, Basement" />
                </Field>
                <Field label="Manufacturer">
                  <input value={form.manufacturer ?? ""} onChange={(e) => set("manufacturer", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Model">
                  <input value={form.model ?? ""} onChange={(e) => set("model", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Serial Number">
                  <input value={form.serialNumber ?? ""} onChange={(e) => set("serialNumber", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Installation Date">
                  <input type="date" value={form.installationDate ?? ""} onChange={(e) => set("installationDate", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Warranty Expiry">
                  <input type="date" value={form.warrantyExpiry ?? ""} onChange={(e) => set("warrantyExpiry", e.target.value)} className={inputClass} />
                </Field>
              </div>
              <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" /> Add Asset
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Asset #</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Warranty Expiry</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{a.assetNumber}</td>
                <td className="px-4 py-3 text-muted">{a.category}</td>
                <td className="px-4 py-3 text-muted">{a.propertyTitle ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{a.condition.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[a.status]}`}>{a.status.replace(/_/g, " ")}</span>
                </td>
                <td className="px-4 py-3 text-muted">{a.warrantyExpiry ? new Date(a.warrantyExpiry).toLocaleDateString("en-GB") : "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/maintenance/assets/${a.id}`} className="text-xs font-bold text-primary hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  No assets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {vendors.length === 0 && <p className="mt-3 text-xs text-muted">Add a vendor first to assign warranty service contacts.</p>}
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
