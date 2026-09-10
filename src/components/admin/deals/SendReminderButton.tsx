"use client";

import { useTransition } from "react";
import { Bell } from "lucide-react";
import { sendPaymentReminderAction } from "@/lib/actions/deals.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function SendReminderButton({ dealId, message }: { dealId: string; message: string }) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function send() {
    startTransition(async () => {
      try {
        await sendPaymentReminderAction(dealId, "payment_overdue", message);
        toast.show("Reminder sent to the customer's portal notifications.");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not send this reminder.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={send}
      disabled={isPending}
      title="Send in-portal payment reminder"
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary disabled:opacity-50"
    >
      <Bell className="h-4 w-4" />
    </button>
  );
}
