"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SupportCategory, SupportDepartment } from "@/lib/models/support";
import { createCategoryAction, updateCategoryAction } from "@/lib/actions/support.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-primary";

export function CategoryManager({ categories, departments }: { categories: SupportCategory[]; departments: SupportDepartment[] }) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [defaultDepartmentId, setDefaultDepartmentId] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function create() {
    if (!code.trim() || !label.trim()) {
      toast.show("Please enter a code and label.");
      return;
    }
    startTransition(async () => {
      try {
        await createCategoryAction({ code: code.trim(), label: label.trim(), defaultDepartmentId: defaultDepartmentId || undefined });
        toast.show("Category created.");
        setCode("");
        setLabel("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this category.");
      }
    });
  }

  function setDepartment(category: SupportCategory, departmentId: string) {
    startTransition(async () => {
      try {
        await updateCategoryAction(category.code, { defaultDepartmentId: departmentId || undefined });
        toast.show("Routing updated.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this category.");
      }
    });
  }

  function toggleActive(category: SupportCategory) {
    startTransition(async () => {
      try {
        await updateCategoryAction(category.code, { active: !category.active });
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this category.");
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-4">
        <input placeholder="Code (e.g. WARRANTY)" value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} />
        <input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} />
        <select value={defaultDepartmentId} onChange={(e) => setDefaultDepartmentId(e.target.value)} className={inputClass}>
          <option value="">No default routing</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={create} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          New Category
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Routes To</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.code} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{c.label}</td>
                <td className="px-4 py-3">
                  <select defaultValue={c.defaultDepartmentId ?? ""} onChange={(e) => setDepartment(c, e.target.value)} className={inputClass}>
                    <option value="">Support Desk (fallback)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button type="button" disabled={isPending} onClick={() => toggleActive(c)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${c.active ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>
                    {c.active ? "Active" : "Inactive"}
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
