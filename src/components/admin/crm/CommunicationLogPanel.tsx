"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { CommunicationLogEntry, CommunicationType, CommunicationDirection } from "@/lib/models/crm";
import { communicationTypes, communicationDirections } from "@/lib/models/crm";
import { logCommunicationAction } from "@/lib/actions/crm.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function CommunicationLogPanel({ leadId, entries }: { leadId: string; entries: CommunicationLogEntry[] }) {
  const [type, setType] = useState<CommunicationType>("Phone");
  const [direction, setDirection] = useState<CommunicationDirection>("Outgoing");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit() {
    setError(null);
    if (!summary.trim()) {
      setError("Please describe what was discussed.");
      return;
    }
    startTransition(async () => {
      try {
        await logCommunicationAction(leadId, type, direction, summary);
        setSummary("");
        toast.show("Communication logged.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not log this communication.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <PhoneCall className="h-4.5 w-4.5 text-primary" /> Communication Log
      </h2>
      <p className="mt-1 text-xs text-muted">
        A record of real contact attempts you or your team have made — nothing here is generated automatically.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as CommunicationType)}
          className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-semibold text-ink outline-none focus:border-primary"
        >
          {communicationTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as CommunicationDirection)}
          className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-semibold text-ink outline-none focus:border-primary"
        >
          {communicationDirections.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What was discussed?"
          className="col-span-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary sm:col-span-1"
        />
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          Log It
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-primary">{error}</p>}

      <div className="mt-4 space-y-2.5">
        {entries.length === 0 && <p className="text-sm text-muted">No communication logged yet.</p>}
        {entries.map((e) => (
          <div key={e.id} className="flex items-start gap-2.5 rounded-lg bg-surface-muted p-3 text-sm">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${e.direction === "Outgoing" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}`}>
              {e.direction === "Outgoing" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
            </span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-ink">{e.communicationType}</span>
                <span className="text-xs text-muted-foreground">({e.direction})</span>
                {e.agentName && <span className="text-xs text-muted-foreground">by {e.agentName}</span>}
              </div>
              <p className="mt-0.5 text-muted">{e.summary}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{new Date(e.createdAt).toLocaleString("en-GB")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
