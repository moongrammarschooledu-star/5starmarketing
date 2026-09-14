"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SupportSlaRule, SupportTicketPriority, SupportDepartment, SupportCategory } from "@/lib/models/support";
import { supportTicketPriorities } from "@/lib/models/support";
import { createSlaRuleAction, updateSlaRuleAction } from "@/lib/actions/support.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-primary";

export function SlaRuleManager({ rules, departments, categories }: { rules: SupportSlaRule[]; departments: SupportDepartment[]; categories: SupportCategory[] }) {
  const [priority, setPriority] = useState<SupportTicketPriority>("NORMAL");
  const [departmentId, setDepartmentId] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [firstResponseMinutes, setFirstResponseMinutes] = useState("240");
  const [resolutionMinutes, setResolutionMinutes] = useState("2880");
  const [businessHoursOnly, setBusinessHoursOnly] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function create() {
    startTransition(async () => {
      try {
        await createSlaRuleAction({
          priority,
          departmentId: departmentId || undefined,
          categoryCode: categoryCode || undefined,
          firstResponseMinutes: Number(firstResponseMinutes),
          resolutionMinutes: Number(resolutionMinutes),
          businessHoursOnly,
        });
        toast.show("SLA rule created.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this rule.");
      }
    });
  }

  function toggleActive(rule: SupportSlaRule) {
    startTransition(async () => {
      try {
        await updateSlaRuleAction(rule.id, { active: !rule.active });
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this rule.");
      }
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-3">
        <select value={priority} onChange={(e) => setPriority(e.target.value as SupportTicketPriority)} className={inputClass}>
          {supportTicketPriorities.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
          <option value="">Any department (global)</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} className={inputClass}>
          <option value="">Any category</option>
          {categories.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <input type="number" placeholder="First response (min)" value={firstResponseMinutes} onChange={(e) => setFirstResponseMinutes(e.target.value)} className={inputClass} />
        <input type="number" placeholder="Resolution (min)" value={resolutionMinutes} onChange={(e) => setResolutionMinutes(e.target.value)} className={inputClass} />
        <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <input type="checkbox" checked={businessHoursOnly} onChange={(e) => setBusinessHoursOnly(e.target.checked)} /> Business hours only
        </label>
        <button type="button" onClick={create} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50 sm:col-span-3">
          Add SLA Rule
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Scope</th>
              <th className="px-4 py-3">Response (min)</th>
              <th className="px-4 py-3">Resolution (min)</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{r.priority}</td>
                <td className="px-4 py-3 text-muted">{r.departmentName ?? r.categoryLabel ? `${r.departmentName ?? ""} ${r.categoryLabel ?? ""}`.trim() : "Global default"}</td>
                <td className="px-4 py-3 text-muted">{r.firstResponseMinutes}</td>
                <td className="px-4 py-3 text-muted">{r.resolutionMinutes}</td>
                <td className="px-4 py-3">
                  <button type="button" disabled={isPending} onClick={() => toggleActive(r)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${r.active ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>
                    {r.active ? "Active" : "Inactive"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
