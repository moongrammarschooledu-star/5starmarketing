"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/models/lead";
import { leadStatuses } from "@/lib/models/lead";
import { updateLeadStatusAction } from "@/lib/actions/leads.actions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useToast } from "@/components/admin/ToastProvider";
import { formatDateOnly } from "@/lib/date";

export function AgentLeadsTable({ leads }: { leads: Lead[] }) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.propertyTitle ?? "").toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
    );
  }, [leads, search]);

  function changeStatus(id: string, status: LeadStatus) {
    startTransition(async () => {
      await updateLeadStatusAction(id, status);
      toast.show("Status updated.");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex max-w-md items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5">
        <Search className="h-4 w-4 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, property or lead ID…"
          className="flex-1 bg-transparent text-sm text-ink outline-none"
        />
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-border bg-surface lg:block">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Next Follow-Up</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No leads assigned to you yet.
                </td>
              </tr>
            )}
            {filtered.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3">
                  <Link href={`/agent/leads/${l.id}`} className="font-semibold text-ink hover:text-primary">
                    {l.name}
                  </Link>
                  <div className="text-xs text-muted">{l.phone}</div>
                </td>
                <td className="px-4 py-3 text-muted">{l.propertyTitle || "—"}</td>
                <td className="px-4 py-3 text-muted">{l.source}</td>
                <td className="px-4 py-3">
                  <select
                    value={l.status}
                    disabled={isPending}
                    onChange={(e) => changeStatus(l.id, e.target.value as LeadStatus)}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-bold text-ink outline-none focus:border-primary"
                  >
                    {leadStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {l.nextFollowUpDate ? `${formatDateOnly(l.nextFollowUpDate)}${l.nextFollowUpTime ? " " + l.nextFollowUpTime.slice(0, 5) : ""}` : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted">{formatDateOnly(l.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/agent/leads/${l.id}`} className="rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-3 lg:hidden">
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">No leads assigned to you yet.</p>
        )}
        {filtered.map((l) => (
          <Link key={l.id} href={`/agent/leads/${l.id}`} className="block rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink">{l.name}</span>
              <StatusBadge status={l.status} />
            </div>
            <div className="mt-1 text-xs text-muted">{l.propertyTitle || l.phone}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
