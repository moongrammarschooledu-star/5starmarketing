"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { ConstructionLaborRecord, ConstructionLaborRecordInput, LaborTrade } from "@/lib/models/construction";
import { laborTrades } from "@/lib/models/construction";
import { createLaborRecordAction, removeLaborRecordAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { formatPKR } from "@/lib/calculator";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function LaborManager({ projectId, records, phases }: { projectId: string; records: ConstructionLaborRecord[]; phases: { id: string; name: string }[] }) {
  const [form, setForm] = useState<Partial<ConstructionLaborRecordInput>>({ trade: "General Labor", hours: 8 });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof ConstructionLaborRecordInput>(key: K, value: ConstructionLaborRecordInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.workerOrTeam?.trim() || !form.hours) {
      toast.show("Please enter a worker/team name and hours.");
      return;
    }
    startTransition(async () => {
      try {
        await createLaborRecordAction(projectId, form as ConstructionLaborRecordInput);
        toast.show("Labor entry recorded.");
        setForm({ trade: "General Labor", hours: 8 });
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not record this labor entry.");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeLaborRecordAction(id, projectId);
      router.refresh();
    });
  }

  const totalCost = records.reduce((s, r) => s + r.totalLaborCost, 0);

  return (
    <div className="mt-3">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="text-sm font-bold text-ink">Record Labor Entry</h3>
        <p className="mt-1 text-xs text-muted">Cost is a tracking figure only — computed from hours/day-rate, never a payroll disbursement.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input placeholder="Worker / Team Name" value={form.workerOrTeam ?? ""} onChange={(e) => set("workerOrTeam", e.target.value)} className={inputClass} />
          <select value={form.trade ?? "General Labor"} onChange={(e) => set("trade", e.target.value as LaborTrade)} className={inputClass}>
            {laborTrades.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={form.phaseId ?? ""} onChange={(e) => set("phaseId", e.target.value)} className={inputClass}>
            <option value="">No phase</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input type="date" value={form.recordDate ?? ""} onChange={(e) => set("recordDate", e.target.value)} className={inputClass} />
          <input type="number" placeholder="Hours" value={form.hours ?? ""} onChange={(e) => set("hours", Number(e.target.value))} className={inputClass} />
          <input type="number" placeholder="Daily Rate (optional)" value={form.dailyRate ?? ""} onChange={(e) => set("dailyRate", Number(e.target.value))} className={inputClass} />
          <input type="number" placeholder="Overtime Hours" value={form.overtimeHours ?? ""} onChange={(e) => set("overtimeHours", Number(e.target.value))} className={inputClass} />
          <input type="number" placeholder="Overtime Rate" value={form.overtimeRate ?? ""} onChange={(e) => set("overtimeRate", Number(e.target.value))} className={inputClass} />
          <input placeholder="Notes (optional)" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className={inputClass} />
        </div>
        <button type="button" onClick={create} disabled={isPending} className="mt-3 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> Record Entry
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Worker / Team</th>
              <th className="px-3 py-2.5">Trade</th>
              <th className="px-3 py-2.5">Hours</th>
              <th className="px-3 py-2.5">OT Hours</th>
              <th className="px-3 py-2.5">Cost</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2.5 text-muted">{new Date(r.recordDate).toLocaleDateString("en-GB")}</td>
                <td className="px-3 py-2.5 text-ink">{r.workerOrTeam}</td>
                <td className="px-3 py-2.5 text-muted">{r.trade}</td>
                <td className="px-3 py-2.5 text-muted">{r.hours}</td>
                <td className="px-3 py-2.5 text-muted">{r.overtimeHours}</td>
                <td className="px-3 py-2.5 font-semibold text-ink">{formatPKR(r.totalLaborCost)}</td>
                <td className="px-3 py-2.5">
                  <button type="button" onClick={() => remove(r.id)} disabled={isPending} className="text-muted hover:text-primary">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted">
                  No labor records yet.
                </td>
              </tr>
            )}
          </tbody>
          {records.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Total
                </td>
                <td className="px-3 py-2.5 font-bold text-ink">{formatPKR(totalCost)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
