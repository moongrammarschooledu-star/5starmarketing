"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { RentalNotice, RentalNoticeInput, NoticeType, NoticeRecipientType } from "@/lib/models/rental";
import { noticeTypes, noticeRecipientTypes } from "@/lib/models/rental";
import { createRentalNoticeAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function NoticeManager({ notices, leases }: { notices: RentalNotice[]; leases: { id: string; label: string; rentalPropertyId: string }[] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<RentalNoticeInput>>({ recipientType: "TENANT", noticeType: "GENERAL_NOTICE" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof RentalNoticeInput>(key: K, value: RentalNoticeInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectLease(id: string) {
    const lease = leases.find((l) => l.id === id);
    setForm((prev) => ({ ...prev, leaseId: id || undefined, rentalPropertyId: lease?.rentalPropertyId ?? prev.rentalPropertyId }));
  }

  function create() {
    if (!form.content?.trim()) {
      toast.show("Please enter the notice content.");
      return;
    }
    startTransition(async () => {
      try {
        await createRentalNoticeAction(form as RentalNoticeInput);
        toast.show("Notice issued.");
        setForm({ recipientType: "TENANT", noticeType: "GENERAL_NOTICE" });
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this notice.");
      }
    });
  }

  return (
    <div className="mt-6">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
          <span className="font-heading text-base font-bold text-ink">New Notice</span>
          {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
        </button>
        {showForm && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <select value={form.leaseId ?? ""} onChange={(e) => selectLease(e.target.value)} className={inputClass}>
                <option value="">No specific lease</option>
                {leases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              <select value={form.recipientType ?? "TENANT"} onChange={(e) => set("recipientType", e.target.value as NoticeRecipientType)} className={inputClass}>
                {noticeRecipientTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select value={form.noticeType ?? "GENERAL_NOTICE"} onChange={(e) => set("noticeType", e.target.value as NoticeType)} className={inputClass}>
                {noticeTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <input type="date" value={form.effectiveDate ?? ""} onChange={(e) => set("effectiveDate", e.target.value)} className={inputClass} />
              <textarea placeholder="Notice content" value={form.content ?? ""} onChange={(e) => set("content", e.target.value)} className={`${inputClass} min-h-20 sm:col-span-3`} />
            </div>
            <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" /> Issue Notice
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {notices.map((n) => (
          <div key={n.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-ink">
                  {n.noticeNumber} — {n.noticeType.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-muted">
                  To {n.recipientType} {n.recipientName ? `(${n.recipientName})` : ""} {n.leaseNumber ? `· ${n.leaseNumber}` : ""} · Issued {new Date(n.issueDate).toLocaleDateString("en-GB")}
                </p>
              </div>
              <StatusBadge status={n.status} />
            </div>
            <p className="mt-2 text-xs text-muted">{n.content}</p>
          </div>
        ))}
        {notices.length === 0 && <p className="text-sm text-muted">No notices issued yet.</p>}
      </div>
    </div>
  );
}
