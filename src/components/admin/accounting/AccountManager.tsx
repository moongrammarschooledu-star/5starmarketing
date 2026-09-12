"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Power, Save } from "lucide-react";
import type { Account, AccountType } from "@/lib/models/accounting";
import { accountTypes } from "@/lib/models/accounting";
import { createAccountAction, updateAccountAction, setAccountActiveAction } from "@/lib/actions/accounting.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function AccountManager({ accounts, fixedType }: { accounts: Account[]; fixedType?: AccountType }) {
  const [selected, setSelected] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);
  const [accountCode, setAccountCode] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>(fixedType ?? "EXPENSE");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function select(a: Account | null) {
    setCreating(false);
    setSelected(a);
    setAccountCode(a?.accountCode ?? "");
    setName(a?.name ?? "");
    setAccountType(a?.accountType ?? fixedType ?? "EXPENSE");
    setParentId(a?.parentId ?? "");
    setDescription(a?.description ?? "");
  }

  function startCreate() {
    setSelected(null);
    setCreating(true);
    setAccountCode("");
    setName("");
    setAccountType(fixedType ?? "EXPENSE");
    setParentId("");
    setDescription("");
  }

  function save() {
    if (!accountCode.trim() || !name.trim()) {
      toast.show("Please enter both a code and a name.");
      return;
    }
    startTransition(async () => {
      try {
        if (creating) {
          const account = await createAccountAction({ accountCode: accountCode.trim(), name: name.trim(), accountType, parentId: parentId || undefined, description: description || undefined });
          toast.show("Account created.");
          select(account);
        } else if (selected) {
          await updateAccountAction(selected.id, { accountCode: accountCode.trim(), name: name.trim(), accountType, parentId: parentId || undefined, description: description || undefined });
          toast.show("Account saved.");
        }
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not save this account.");
      }
    });
  }

  function toggleActive(a: Account) {
    startTransition(async () => {
      await setAccountActiveAction(a.id, !a.isActive);
      toast.show(a.isActive ? "Deactivated." : "Activated.");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <button type="button" onClick={startCreate} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> New {fixedType === "EXPENSE" ? "Category" : "Account"}
        </button>
        <div className="mt-3 space-y-2">
          {accounts.length === 0 && <p className="text-sm text-muted">No accounts yet.</p>}
          {accounts.map((a) => (
            <button key={a.id} type="button" onClick={() => select(a)} className={`block w-full rounded-xl border p-3 text-left text-sm ${selected?.id === a.id ? "border-primary bg-primary/5" : "border-border bg-surface"}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">{a.name}</span>
                {!a.isActive && <span className="rounded-full bg-muted/20 px-2 py-0.5 text-[10px] font-bold text-muted">Inactive</span>}
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {a.accountCode} {a.parentName ? `· under ${a.parentName}` : ""}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {!selected && !creating ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">Select an account to edit, or create a new one.</div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-ink">Code</span>
                <input type="text" value={accountCode} onChange={(e) => setAccountCode(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-ink">Name</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
              </label>
            </div>

            {!fixedType && (
              <label className="flex max-w-xs flex-col gap-1.5 text-sm">
                <span className="font-semibold text-ink">Type</span>
                <select value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
                  {accountTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Parent Account (optional)</span>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
                <option value="">None</option>
                {accounts
                  .filter((a) => a.id !== selected?.id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Description</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
            </label>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button type="button" onClick={save} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                <Save className="h-4 w-4" /> Save
              </button>
              {selected && (
                <button type="button" onClick={() => toggleActive(selected)} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
                  <Power className="h-4 w-4" /> {selected.isActive ? "Deactivate" : "Activate"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
