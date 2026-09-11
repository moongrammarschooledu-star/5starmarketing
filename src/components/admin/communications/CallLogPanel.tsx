"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall, PhoneIncoming, PhoneOutgoing, Plus } from "lucide-react";
import type { CallLogEntry, CallOutcome } from "@/lib/models/communication";
import { callOutcomes } from "@/lib/models/communication";
import { logCallAction } from "@/lib/actions/communications.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function CallLogPanel({
  conversationId,
  leadId,
  customerId,
  logs,
}: {
  conversationId: string;
  leadId?: string;
  customerId?: string;
  logs: CallLogEntry[];
}) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"Outgoing" | "Incoming">("Outgoing");
  const [outcome, setOutcome] = useState<CallOutcome>("CONNECTED");
  const [notes, setNotes] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function save() {
    startTransition(async () => {
      try {
        await logCallAction({
          conversationId,
          leadId,
          customerId,
          direction,
          outcome,
          notes: notes || undefined,
          nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : undefined,
        });
        toast.show("Call logged.");
        setNotes("");
        setNextFollowUpAt("");
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not save this call log.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
          <PhoneCall className="h-4 w-4 text-primary" /> Call Log
        </h3>
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 rounded-full border-2 border-ink/15 px-3 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary">
          <Plus className="h-3.5 w-3.5" /> Log a Call
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">Manual log only — not verified by a telephony provider.</p>

      {open && (
        <div className="mt-3 space-y-2 rounded-xl border border-dashed border-border p-3">
          <div className="flex flex-wrap gap-2">
            <select value={direction} onChange={(e) => setDirection(e.target.value as "Outgoing" | "Incoming")} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-primary">
              <option value="Outgoing">Outgoing</option>
              <option value="Incoming">Incoming</option>
            </select>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as CallOutcome)} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-primary">
              {callOutcomes.map((o) => (
                <option key={o} value={o}>
                  {o.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <input type="datetime-local" value={nextFollowUpAt} onChange={(e) => setNextFollowUpAt(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-primary" title="Next follow-up (optional)" />
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes (optional)" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
          <div className="flex justify-end">
            <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
              {isPending ? "Saving..." : "Save Call Log"}
            </button>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <ul className="mt-3 space-y-2">
          {logs.slice(0, 10).map((log) => (
            <li key={log.id} className="flex items-start gap-2 border-b border-border pb-2 text-xs last:border-0">
              {log.direction === "Outgoing" ? <PhoneOutgoing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> : <PhoneIncoming className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />}
              <div>
                <p className="font-semibold text-ink">
                  {log.direction} · {log.outcome.replace(/_/g, " ")} {log.agentName && <span className="text-muted-foreground">— {log.agentName}</span>}
                </p>
                {log.notes && <p className="mt-0.5 text-muted-foreground">{log.notes}</p>}
                <p className="mt-0.5 text-muted-foreground">{new Date(log.createdAt).toLocaleString("en-GB")}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
