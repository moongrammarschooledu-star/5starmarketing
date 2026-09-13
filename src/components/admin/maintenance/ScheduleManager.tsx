"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp, CheckCircle2, Trash2 } from "lucide-react";
import type { MaintenanceSchedule, MaintenanceScheduleInput, ScheduleFrequency } from "@/lib/models/maintenance";
import { scheduleFrequencies } from "@/lib/models/maintenance";
import { createScheduleAction, markScheduleCompletedAction, removeScheduleAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { formatPKR } from "@/lib/calculator";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

const PREVENTIVE_TYPES = ["AC Service", "Generator Service", "Water Tank Cleaning", "Elevator Maintenance", "Electrical Inspection", "Plumbing Inspection", "Fire Safety Inspection", "Roof Inspection", "Painting", "Pest Control", "Security System Inspection"];

export function ScheduleManager({ schedules, properties, vendors, canManage }: { schedules: MaintenanceSchedule[]; properties: { id: string; title: string }[]; vendors: { id: string; businessName: string }[]; canManage: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<MaintenanceScheduleInput>>({ propertyId: properties[0]?.id, frequency: "MONTHLY", nextDueDate: new Date().toISOString().slice(0, 10) });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof MaintenanceScheduleInput>(key: K, value: MaintenanceScheduleInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.maintenanceType?.trim() || !form.nextDueDate) {
      toast.show("Please enter a maintenance type and next due date.");
      return;
    }
    startTransition(async () => {
      try {
        await createScheduleAction(form as MaintenanceScheduleInput);
        toast.show("Schedule created.");
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this schedule.");
      }
    });
  }

  function markCompleted(id: string) {
    startTransition(async () => {
      await markScheduleCompletedAction(id);
      toast.show("Marked completed — next due date rolled forward.");
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this preventive maintenance schedule?")) return;
    startTransition(async () => {
      await removeScheduleAction(id);
      router.refresh();
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      {canManage && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
            <span className="font-heading text-base font-bold text-ink">Add Schedule</span>
            {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
          </button>
          {showForm && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Property</span>
                  <select value={form.propertyId ?? ""} onChange={(e) => set("propertyId", e.target.value)} className={inputClass}>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Maintenance Type</span>
                  <input list="preventive-types" value={form.maintenanceType ?? ""} onChange={(e) => set("maintenanceType", e.target.value)} className={inputClass} />
                  <datalist id="preventive-types">
                    {PREVENTIVE_TYPES.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Frequency</span>
                  <select value={form.frequency} onChange={(e) => set("frequency", e.target.value as ScheduleFrequency)} className={inputClass}>
                    {scheduleFrequencies.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                {form.frequency === "CUSTOM" && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Custom Interval (days)</span>
                    <input type="number" value={form.customIntervalDays ?? ""} onChange={(e) => set("customIntervalDays", Number(e.target.value))} className={inputClass} />
                  </label>
                )}
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Next Due Date</span>
                  <input type="date" value={form.nextDueDate ?? ""} onChange={(e) => set("nextDueDate", e.target.value)} className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Vendor</span>
                  <select value={form.assignedVendorId ?? ""} onChange={(e) => set("assignedVendorId", e.target.value)} className={inputClass}>
                    <option value="">None</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.businessName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Estimated Cost</span>
                  <input type="number" value={form.estimatedCost ?? ""} onChange={(e) => set("estimatedCost", Number(e.target.value))} className={inputClass} />
                </label>
              </div>
              <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" /> Add Schedule
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Frequency</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Next Due</th>
              <th className="px-4 py-3">Est. Cost</th>
              {canManage && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{s.propertyTitle ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{s.maintenanceType}</td>
                <td className="px-4 py-3 text-muted">{s.frequency}</td>
                <td className="px-4 py-3 text-muted">{s.assignedVendorName ?? "—"}</td>
                <td className={`px-4 py-3 ${s.nextDueDate <= today ? "font-bold text-primary" : "text-muted"}`}>{new Date(s.nextDueDate).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3 text-muted">{s.estimatedCost != null ? formatPKR(s.estimatedCost) : "—"}</td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => markCompleted(s.id)} disabled={isPending} className="text-success hover:text-success/80" title="Mark completed">
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => remove(s.id)} disabled={isPending} className="text-muted hover:text-primary" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {schedules.length === 0 && (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="px-4 py-10 text-center text-sm text-muted">
                  No preventive maintenance schedules yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
