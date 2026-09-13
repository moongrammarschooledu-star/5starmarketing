"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp, Star } from "lucide-react";
import type { MaintenanceVendor, MaintenanceVendorInput, VendorStatus } from "@/lib/models/maintenance";
import { createVendorAction, setVendorStatusAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

const STATUS_STYLE: Record<VendorStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-600",
  SUSPENDED: "bg-red-100 text-red-800",
};

export function VendorManager({ vendors, canManage }: { vendors: MaintenanceVendor[]; canManage: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<MaintenanceVendorInput> & { serviceCategoriesText?: string; coverageAreasText?: string }>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends string>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.businessName?.trim()) {
      toast.show("Please enter a business name.");
      return;
    }
    startTransition(async () => {
      try {
        await createVendorAction({
          businessName: form.businessName!.trim(),
          contactPerson: form.contactPerson,
          phone: form.phone,
          email: form.email,
          address: form.address,
          serviceCategories: (form.serviceCategoriesText ?? "").split(",").map((s) => s.trim()).filter(Boolean),
          coverageAreas: (form.coverageAreasText ?? "").split(",").map((s) => s.trim()).filter(Boolean),
          notes: form.notes,
        });
        toast.show("Vendor created.");
        setForm({});
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this vendor.");
      }
    });
  }

  function cycleStatus(vendor: MaintenanceVendor) {
    const next: VendorStatus = vendor.status === "ACTIVE" ? "SUSPENDED" : vendor.status === "SUSPENDED" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      await setVendorStatusAction(vendor.id, next);
      router.refresh();
    });
  }

  return (
    <div>
      {canManage && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
            <span className="font-heading text-base font-bold text-ink">Add Vendor</span>
            {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
          </button>
          {showForm && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Business Name *">
                  <input value={form.businessName ?? ""} onChange={(e) => set("businessName", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Contact Person">
                  <input value={form.contactPerson ?? ""} onChange={(e) => set("contactPerson", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Phone">
                  <input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Email">
                  <input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Service Categories (comma-separated)">
                  <input value={form.serviceCategoriesText ?? ""} onChange={(e) => set("serviceCategoriesText", e.target.value)} className={inputClass} placeholder="Plumbing, Electrical" />
                </Field>
                <Field label="Coverage Areas (comma-separated)">
                  <input value={form.coverageAreasText ?? ""} onChange={(e) => set("coverageAreasText", e.target.value)} className={inputClass} placeholder="Lahore, Johar Town" />
                </Field>
              </div>
              <Field label="Address">
                <input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Notes">
                <textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className={`${inputClass} min-h-16`} />
              </Field>
              <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" /> Add Vendor
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map((v) => (
          <div key={v.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-heading text-sm font-bold text-ink">{v.businessName}</p>
                <p className="text-xs text-muted">{v.contactPerson ?? "—"}</p>
              </div>
              {canManage && (
                <button type="button" onClick={() => cycleStatus(v)} disabled={isPending} className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[v.status]}`}>
                  {v.status}
                </button>
              )}
              {!canManage && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[v.status]}`}>{v.status}</span>}
            </div>
            <div className="mt-2 space-y-0.5 text-xs text-muted">
              {v.phone && <p>{v.phone}</p>}
              {v.email && <p>{v.email}</p>}
              {v.address && <p>{v.address}</p>}
            </div>
            {v.serviceCategories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {v.serviceCategories.map((c) => (
                  <span key={c} className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-muted">
                    {c}
                  </span>
                ))}
              </div>
            )}
            {v.rating != null && (
              <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-ink">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {v.rating.toFixed(1)}
              </p>
            )}
          </div>
        ))}
        {vendors.length === 0 && <p className="col-span-full text-sm text-muted">No vendors yet.</p>}
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
