"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SupportCategory, SupportTicketPriority } from "@/lib/models/support";
import { supportTicketPriorities } from "@/lib/models/support";
import { createTicketAsCustomerAction, createTicketAsStaffAction, fileComplaintAsCustomerAction, fileComplaintAsStaffAction } from "@/lib/actions/support.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function NewTicketForm({ categories, mode, isComplaint }: { categories: SupportCategory[]; mode: "staff" | "customer"; isComplaint?: boolean }) {
  const [subject, setSubject] = useState("");
  const [categoryCode, setCategoryCode] = useState(categories[0]?.code ?? "");
  const [priority, setPriority] = useState<SupportTicketPriority>("NORMAL");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit() {
    if (!subject.trim() || !description.trim()) {
      setError("Please fill in the subject and description.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        if (isComplaint) {
          const complaint =
            mode === "staff"
              ? await fileComplaintAsStaffAction({ subject: subject.trim(), description: description.trim(), priority })
              : await fileComplaintAsCustomerAction({ subject: subject.trim(), description: description.trim() });
          toast.show("Complaint filed.");
          router.push(mode === "staff" ? `/admin/support/tickets/${complaint.ticketId}` : `/customer/support/tickets/${complaint.ticketId}`);
          return;
        }
        const action = mode === "staff" ? createTicketAsStaffAction : createTicketAsCustomerAction;
        const ticket = await action({ subject: subject.trim(), description: description.trim(), categoryCode, priority: mode === "staff" ? priority : undefined });
        toast.show("Ticket created.");
        router.push(mode === "staff" ? `/admin/support/tickets/${ticket.id}` : `/customer/support/tickets/${ticket.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create this ticket.");
      }
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={`${inputClass} sm:col-span-2`} />
        {!isComplaint && (
          <select value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} className={inputClass}>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        )}
        {mode === "staff" && (
          <select value={priority} onChange={(e) => setPriority(e.target.value as SupportTicketPriority)} className={inputClass}>
            {supportTicketPriorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
        <textarea placeholder="Describe the issue or request…" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={`${inputClass} sm:col-span-2`} />
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-primary">{error}</p>}
      <button type="button" onClick={submit} disabled={isPending} className="mt-3 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {isPending ? "Submitting…" : "Create Ticket"}
      </button>
      <p className="mt-2 text-xs text-muted">You can attach supporting files once the ticket is created.</p>
    </div>
  );
}
