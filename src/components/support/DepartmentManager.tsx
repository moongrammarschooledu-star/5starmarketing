"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SupportDepartment, SupportDepartmentStaffMember } from "@/lib/models/support";
import { createDepartmentAction, updateDepartmentAction, addDepartmentStaffAction, removeDepartmentStaffAction } from "@/lib/actions/support.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-primary";

export function DepartmentManager({ departments, staffByDept, admins }: { departments: SupportDepartment[]; staffByDept: Record<string, SupportDepartmentStaffMember[]>; admins: { id: string; name: string }[] }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pickAdminId, setPickAdminId] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function create() {
    if (!code.trim() || !name.trim()) {
      toast.show("Please enter a code and name.");
      return;
    }
    startTransition(async () => {
      try {
        await createDepartmentAction({ code: code.trim(), name: name.trim() });
        toast.show("Department created.");
        setCode("");
        setName("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this department.");
      }
    });
  }

  function setManager(departmentId: string, managerId: string) {
    startTransition(async () => {
      try {
        await updateDepartmentAction(departmentId, { managerId: managerId || undefined });
        toast.show("Manager updated.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update the manager.");
      }
    });
  }

  function addStaff(departmentId: string) {
    if (!pickAdminId) return;
    startTransition(async () => {
      try {
        await addDepartmentStaffAction(departmentId, pickAdminId);
        toast.show("Staff member added.");
        setPickAdminId("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not add this staff member.");
      }
    });
  }

  function removeStaff(departmentId: string, adminId: string) {
    startTransition(async () => {
      try {
        await removeDepartmentStaffAction(departmentId, adminId);
        toast.show("Staff member removed.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not remove this staff member.");
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-4">
        <input placeholder="Code (e.g. BILLING)" value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} />
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        <button type="button" onClick={create} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          New Department
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {departments.map((d) => (
          <div key={d.id} className="rounded-xl border border-border bg-surface p-4">
            <button type="button" onClick={() => setExpanded(expanded === d.id ? null : d.id)} className="flex w-full items-center justify-between text-left">
              <span className="text-sm font-bold text-ink">
                {d.name} <span className="text-xs font-normal text-muted">({d.code}) — {d.staffCount ?? 0} staff</span>
              </span>
              <span className="text-xs text-muted">{d.managerName ?? "No manager"}</span>
            </button>
            {expanded === d.id && (
              <div className="mt-3 space-y-3 border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">Manager</span>
                  <select defaultValue={d.managerId ?? ""} onChange={(e) => setManager(d.id, e.target.value)} className={inputClass}>
                    <option value="">Unassigned</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  {(staffByDept[d.id] ?? []).map((s) => (
                    <div key={s.adminId} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-1.5 text-xs">
                      <span>{s.adminName}</span>
                      <button type="button" disabled={isPending} onClick={() => removeStaff(d.id, s.adminId)} className="font-bold text-primary hover:underline">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <select value={pickAdminId} onChange={(e) => setPickAdminId(e.target.value)} className={inputClass}>
                    <option value="">Add staff member…</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" disabled={isPending} onClick={() => addStaff(d.id)} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted">
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
