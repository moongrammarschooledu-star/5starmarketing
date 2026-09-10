"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Pause, Play, Archive } from "lucide-react";
import clsx from "clsx";
import type { Campaign, CampaignStatus } from "@/lib/models/campaign";
import { setCampaignStatusAction, deleteCampaignAction } from "@/lib/actions/marketing.actions";
import { ConfirmDialog, useConfirmDelete } from "./ConfirmDialog";
import { useToast } from "./ToastProvider";
import { CampaignComparisonTable } from "./CampaignComparisonTable";
import { formatDateOnly } from "@/lib/date";

const STATUS_TONE: Record<CampaignStatus, string> = {
  Draft: "bg-muted/20 text-muted",
  Active: "bg-success/10 text-success",
  Paused: "bg-amber-500/10 text-amber-600",
  Completed: "bg-primary/10 text-primary",
  Archived: "bg-ink/10 text-ink",
};

export function CampaignsTable({ campaigns }: { campaigns: Campaign[] }) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();
  const toast = useToast();

  const del = useConfirmDelete<Campaign>(async (id) => {
    await deleteCampaignAction(id);
    toast.show("Campaign deleted.");
    router.refresh();
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function changeStatus(id: string, status: CampaignStatus) {
    startTransition(async () => {
      await setCampaignStatusAction(id, status);
      toast.show(`Campaign marked ${status}.`);
      router.refresh();
    });
  }

  return (
    <div>
      {selected.size >= 2 && (
        <div className="mb-4">
          <CampaignComparisonTable campaigns={campaigns.filter((c) => selected.has(c.id))} />
        </div>
      )}

      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface lg:block">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No campaigns yet.
                </td>
              </tr>
            )}
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    aria-label={`Select ${c.name} for comparison`}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/marketing/campaigns/${c.id}`} className="font-semibold text-ink hover:text-primary">
                    {c.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{c.utmCampaign}</div>
                </td>
                <td className="px-4 py-3 text-muted">{c.platform}</td>
                <td className="px-4 py-3 text-muted">{c.campaignType}</td>
                <td className="px-4 py-3 text-xs text-muted">
                  {c.startDate ? formatDateOnly(c.startDate) : "—"} – {c.endDate ? formatDateOnly(c.endDate) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-bold", STATUS_TONE[c.status])}>{c.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    {c.status === "Active" && (
                      <button type="button" disabled={isPending} onClick={() => changeStatus(c.id, "Paused")} className="rounded-full bg-amber-500/10 p-1.5 text-amber-600" aria-label="Pause">
                        <Pause className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {(c.status === "Draft" || c.status === "Paused") && (
                      <button type="button" disabled={isPending} onClick={() => changeStatus(c.id, "Active")} className="rounded-full bg-success/10 p-1.5 text-success" aria-label="Activate">
                        <Play className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {c.status !== "Archived" && (
                      <button type="button" disabled={isPending} onClick={() => changeStatus(c.id, "Archived")} className="rounded-full bg-ink/10 p-1.5 text-ink" aria-label="Archive">
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button type="button" onClick={() => del.open(c)} className="rounded-full bg-primary/10 p-1.5 text-primary" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 lg:hidden">
        {campaigns.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">No campaigns yet.</p>
        )}
        {campaigns.map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <Link href={`/admin/marketing/campaigns/${c.id}`} className="font-bold text-ink hover:text-primary">
                {c.name}
              </Link>
              <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-bold", STATUS_TONE[c.status])}>{c.status}</span>
            </div>
            <div className="mt-1 text-xs text-muted">
              {c.platform} · {c.campaignType}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!del.target}
        message={`Delete "${del.target?.name}"? Leads already attributed to it keep their history but lose the campaign link. This cannot be undone.`}
        confirmLabel="Delete Campaign"
        busy={del.busy}
        onConfirm={del.confirm}
        onClose={del.close}
      />
    </div>
  );
}
