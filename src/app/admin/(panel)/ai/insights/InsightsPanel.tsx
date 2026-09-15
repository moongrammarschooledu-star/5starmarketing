"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { regenerateAiInsightsAction, acknowledgeAiInsightAction } from "@/lib/actions/ai.actions";
import type { AiInsight } from "@/lib/models/ai";

const CONFIDENCE_COLOR: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-green-100 text-green-700",
};

export function InsightsPanel({ initialInsights }: { initialInsights: AiInsight[] }) {
  const [insights, setInsights] = useState(initialInsights);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      await regenerateAiInsightsAction();
      window.location.reload();
    });
  }

  function act(id: string, status: "ACKNOWLEDGED" | "DISMISSED") {
    startTransition(async () => {
      await acknowledgeAiInsightAction(id, status);
      setInsights((prev) => prev.filter((i) => i.id !== id));
    });
  }

  return (
    <div className="mt-6">
      <button onClick={refresh} disabled={pending} className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold text-ink disabled:opacity-50">
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} /> Refresh insights
      </button>

      <div className="mt-4 space-y-3">
        {insights.map((i) => (
          <div key={i.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${CONFIDENCE_COLOR[i.confidence]}`}>{i.confidence} confidence</span>
                <p className="mt-2 font-heading text-base font-bold text-ink">{i.title}</p>
                <p className="mt-1 text-sm text-muted">{i.description}</p>
                <p className="mt-2 text-xs text-muted">
                  Source: {i.dataSource} · Period: {i.timePeriod} · Reason: {i.reason}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => act(i.id, "ACKNOWLEDGED")} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white">
                  Acknowledge
                </button>
                <button onClick={() => act(i.id, "DISMISSED")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-ink">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
        {insights.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
            No open insights. Click &quot;Refresh insights&quot; to regenerate from current data.
          </p>
        )}
      </div>
    </div>
  );
}
