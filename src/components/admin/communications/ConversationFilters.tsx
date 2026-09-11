"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { ConversationSearchFilters } from "@/lib/models/communication";
import { commChannels, conversationPriorities } from "@/lib/models/communication";

const ALL = "";

export function ConversationFilters({ filters, agents }: { filters: ConversationSearchFilters; agents: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(filters.q ?? "");
  const [, startTransition] = useTransition();

  function update(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    update({ q: q.trim() || undefined });
  }

  const hasFilters = filters.channel || filters.agentId || filters.unassigned || filters.priority || filters.status || filters.unmatchedOnly || filters.q;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, phone, email..."
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
        <select value={filters.channel ?? ALL} onChange={(e) => update({ channel: e.target.value || undefined })} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary">
          <option value={ALL}>All Channels</option>
          {commChannels.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filters.unassigned ? "unassigned" : filters.agentId ?? ALL}
          onChange={(e) => {
            if (e.target.value === "unassigned") update({ agent: undefined, unassigned: "1" });
            else update({ agent: e.target.value || undefined, unassigned: undefined });
          }}
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary"
        >
          <option value={ALL}>All Agents</option>
          <option value="unassigned">Unassigned</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select value={filters.priority ?? ALL} onChange={(e) => update({ priority: e.target.value || undefined })} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary">
          <option value={ALL}>All Priorities</option>
          {conversationPriorities.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-ink">
          <input type="checkbox" checked={!!filters.unmatchedOnly} onChange={(e) => update({ unmatched: e.target.checked ? "1" : undefined })} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
          Unmatched only
        </label>
        {hasFilters && (
          <button type="button" onClick={() => router.push(pathname, { scroll: false })} className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:underline">
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </form>
    </div>
  );
}
