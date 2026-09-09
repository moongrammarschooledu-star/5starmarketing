"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Clock } from "lucide-react";
import type { WhatsAppActivity } from "@/lib/models/whatsapp";
import { logWhatsAppActivityAction } from "@/lib/actions/whatsapp.actions";
import { useToast } from "./ToastProvider";

const ACTION_TONE: Record<string, string> = {
  "WhatsApp Opened": "bg-success/10 text-success",
  "Follow-Up Required": "bg-amber-500/10 text-amber-600",
  Contacted: "bg-primary/10 text-primary",
};

export function WhatsAppActivityLog({ leadId, activity }: { leadId: string; activity: WhatsAppActivity[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function record(action: "Follow-Up Required" | "Contacted") {
    startTransition(async () => {
      await logWhatsAppActivityAction(leadId, action);
      toast.show(`Logged: ${action}.`);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
          <MessageCircle className="h-4.5 w-4.5 text-primary" /> WhatsApp Activity
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => record("Contacted")}
            className="rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
          >
            Log Contacted
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => record("Follow-Up Required")}
            className="rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
          >
            Log Follow-Up Required
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Normal WhatsApp links don&apos;t report delivery or read status — this is an honest log of
        what your team actually did, not automated delivery tracking.
      </p>

      <div className="mt-4 space-y-2.5">
        {activity.length === 0 && <p className="text-sm text-muted">No WhatsApp activity yet.</p>}
        {activity.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/50 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ACTION_TONE[a.action] ?? "bg-ink/5 text-ink"}`}>
                {a.action}
              </span>
              {a.templateName && (
                <span className="text-xs text-muted-foreground">via {a.templateName}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {new Date(a.createdAt).toLocaleString("en-GB")}
              {a.admin && <span className="font-semibold text-ink">· {a.admin}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
