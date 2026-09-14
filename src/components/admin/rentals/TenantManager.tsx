"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { Tenant, TenantInput, TenantStatus } from "@/lib/models/rental";
import { tenantStatuses } from "@/lib/models/rental";
import { createTenantAction, setTenantStatusAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function TenantManager({ tenants }: { tenants: Tenant[] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<TenantInput>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof TenantInput>(key: K, value: TenantInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.name?.trim()) {
      toast.show("Please enter a tenant name.");
      return;
    }
    startTransition(async () => {
      try {
        await createTenantAction(form as TenantInput);
        toast.show("Tenant created.");
        setForm({});
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this tenant.");
      }
    });
  }

  function setStatus(id: string, status: TenantStatus) {
    startTransition(async () => {
      try {
        await setTenantStatusAction(id, status);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this tenant.");
      }
    });
  }

  return (
    <div className="mt-6">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
          <span className="font-heading text-base font-bold text-ink">Add Tenant</span>
          {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
        </button>
        {showForm && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input placeholder="Full Name" value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} className={inputClass} />
              <input placeholder="Phone" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
              <input placeholder="Email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} className={inputClass} />
              <input placeholder="Emergency Contact Name" value={form.emergencyContactName ?? ""} onChange={(e) => set("emergencyContactName", e.target.value)} className={inputClass} />
              <input placeholder="Emergency Contact Phone" value={form.emergencyContactPhone ?? ""} onChange={(e) => set("emergencyContactPhone", e.target.value)} className={inputClass} />
              <input placeholder="Notes" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className={inputClass} />
            </div>
            <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" /> Add Tenant
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {tenants.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-ink">{t.name}</p>
                <p className="text-xs text-muted">
                  {t.phone ?? "—"} {t.currentPropertyTitle ? `· ${t.currentPropertyTitle}${t.currentUnitNumber ? ` (${t.currentUnitNumber})` : ""}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={t.status} />
                <select value={t.status} onChange={(e) => setStatus(t.id, e.target.value as TenantStatus)} disabled={isPending} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary">
                  {tenantStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
        {tenants.length === 0 && <p className="text-sm text-muted">No tenants yet.</p>}
      </div>
    </div>
  );
}
