"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import clsx from "clsx";
import { dateRangeOptions, type DateRangeKey } from "@/lib/models/analytics";

export function AnalyticsTimeFilter({ current, lastUpdated }: { current: DateRangeKey; lastUpdated: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showCustom, setShowCustom] = useState(current === "custom");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [refreshing, setRefreshing] = useState(false);

  function applyRange(key: DateRangeKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", key);
    if (key !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyCustom() {
    if (!from || !to) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", from);
    params.set("to", to);
    router.push(`${pathname}?${params.toString()}`);
  }

  function refresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex flex-wrap gap-1.5 rounded-full border border-border bg-surface p-1">
        {dateRangeOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              if (opt.key === "custom") {
                setShowCustom(true);
              } else {
                setShowCustom(false);
                applyRange(opt.key);
              }
            }}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              current === opt.key ? "bg-primary text-primary-foreground" : "text-muted hover:text-ink"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary"
          />
          <span className="text-xs text-muted">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={applyCustom}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
          >
            Apply
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={refresh}
        className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary"
      >
        <RefreshCw className={clsx("h-3.5 w-3.5", refreshing && "animate-spin")} /> Refresh
      </button>

      <span className="text-[11px] text-muted-foreground">Last updated: {lastUpdated}</span>
    </div>
  );
}
