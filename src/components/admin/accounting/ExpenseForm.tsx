"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Paperclip, X } from "lucide-react";
import type { Account, FinancePaymentMethod } from "@/lib/models/accounting";
import { financePaymentMethods } from "@/lib/models/accounting";
import { createExpenseAction, uploadExpenseAttachmentAction } from "@/lib/actions/accounting.actions";
import { useToast } from "@/components/admin/ToastProvider";

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ExpenseForm({
  accounts,
  properties,
  projects,
  deals,
  agents,
}: {
  accounts: Account[];
  properties: { id: string; title: string }[];
  projects: { id: string; name: string }[];
  deals: { id: string; dealNumber: string }[];
  agents: { id: string; name: string }[];
}) {
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<FinancePaymentMethod | "">("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [dealId, setDealId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    const oversized = picked.find((f) => f.size > MAX_ATTACHMENT_BYTES);
    if (oversized) {
      toast.show(`${oversized.name} is larger than 15MB.`);
      return;
    }
    setFiles((prev) => [...prev, ...picked]);
  }

  function submit(saveDraft: boolean) {
    setError(null);
    const amountNum = Number(amount);
    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }
    if (!amount || !Number.isFinite(amountNum) || amountNum < 0) {
      setError("Please enter a valid amount.");
      return;
    }
    startTransition(async () => {
      try {
        const expense = await createExpenseAction(
          {
            expenseDate,
            accountId: accountId || undefined,
            description: description.trim(),
            amount: amountNum,
            vendor: vendor || undefined,
            paymentMethod: paymentMethod || undefined,
            referenceNumber: referenceNumber || undefined,
            propertyId: propertyId || undefined,
            projectId: projectId || undefined,
            dealId: dealId || undefined,
            agentId: agentId || undefined,
            notes: notes || undefined,
          },
          saveDraft
        );

        for (const file of files) {
          try {
            const dataUri = await readFileAsDataUri(file);
            await uploadExpenseAttachmentAction(expense.id, file.name, dataUri);
          } catch (e) {
            toast.show(e instanceof Error ? `${file.name}: ${e.message}` : `Could not attach ${file.name}.`);
          }
        }

        toast.show(saveDraft ? "Draft saved." : "Expense submitted.");
        router.push(`/admin/accounting/expenses/${expense.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save this expense.");
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Expense Date</span>
          <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Category</span>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">Select category...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink">Description</span>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Amount (PKR)</span>
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Vendor</span>
          <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Payment Method</span>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as FinancePaymentMethod)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">Select...</option>
            {financePaymentMethods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink">Reference Number</span>
        <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="max-w-xs rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Property (optional)</span>
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">None</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Project (optional)</span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">None</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Deal (optional)</span>
          <select value={dealId} onChange={(e) => setDealId(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">None</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.dealNumber}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Agent / Employee (optional)</span>
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">None</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink">Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
      </label>

      <div>
        <span className="text-sm font-semibold text-ink">Receipt / Invoice</span>
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <span key={`${f.name}-${i}`} className="flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink">
                <Paperclip className="h-3 w-3" /> {f.name}
                <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted hover:text-primary">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <input ref={fileInputRef} type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => pickFiles(e.target.files)} className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
          <Paperclip className="h-3.5 w-3.5" /> Attach Receipt
        </button>
      </div>

      <div className="flex flex-wrap gap-2.5 pt-2">
        <button type="button" onClick={() => submit(true)} disabled={isPending} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
          Save as Draft
        </button>
        <button type="button" onClick={() => submit(false)} disabled={isPending} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {isPending ? "Submitting..." : "Submit for Approval"}
        </button>
      </div>
    </div>
  );
}
