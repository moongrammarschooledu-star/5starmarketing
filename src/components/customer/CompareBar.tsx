"use client";

import Link from "next/link";
import { Scale, X } from "lucide-react";
import { useCompare } from "./CompareProvider";

export function CompareBar() {
  const { ids, clear } = useCompare();
  if (ids.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-ink px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Scale className="h-4.5 w-4.5 text-primary" />
          {ids.length} propert{ids.length === 1 ? "y" : "ies"} selected to compare
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1 rounded-full border border-white/20 px-3 py-2 text-xs font-bold text-white/70 hover:text-white"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
          <Link
            href="/compare"
            className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
          >
            Compare Properties
          </Link>
        </div>
      </div>
    </div>
  );
}
