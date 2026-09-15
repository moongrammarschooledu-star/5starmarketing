"use client";

import { useTransition } from "react";
import { reviewAiActionRequestAction } from "@/lib/actions/ai.actions";
import type { AiActionRequest } from "@/lib/models/ai";

export function ApprovalQueue({ requests }: { requests: AiActionRequest[] }) {
  const [pending, startTransition] = useTransition();

  function decide(id: string, decision: "APPROVED" | "REJECTED") {
    startTransition(() => {
      reviewAiActionRequestAction(id, decision);
    });
  }

  if (requests.length === 0) {
    return <p className="mt-3 rounded-2xl border border-border bg-surface p-4 text-sm text-muted">Nothing waiting for approval right now.</p>;
  }

  return (
    <div className="mt-3 space-y-3">
      {requests.map((r) => (
        <div key={r.id} className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">
                {r.assistantType} · {r.tier} · {r.actionType}
              </p>
              <p className="mt-1 text-sm font-medium text-ink">{r.summary}</p>
              {r.targetTable && (
                <p className="mt-1 text-xs text-muted">
                  Affects: {r.targetTable}
                  {r.targetRecordId ? ` #${r.targetRecordId}` : ""}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                disabled={pending}
                onClick={() => decide(r.id, "APPROVED")}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                Approve
              </button>
              <button
                disabled={pending}
                onClick={() => decide(r.id, "REJECTED")}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-ink disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
