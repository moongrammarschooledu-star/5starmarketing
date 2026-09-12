"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Trash2, Pencil } from "lucide-react";
import type { InvestmentAnalysis } from "@/lib/models/investment";
import { renameAnalysisAction, removeAnalysisAction, duplicateAnalysisAction } from "@/lib/actions/investment.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { formatPKR } from "@/lib/calculator";

export function SavedAnalysesList({ analyses }: { analyses: InvestmentAnalysis[] }) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function startRename(analysis: InvestmentAnalysis) {
    setRenamingId(analysis.id);
    setNewName(analysis.name);
  }

  function rename() {
    if (!renamingId || !newName.trim()) return;
    startTransition(async () => {
      await renameAnalysisAction(renamingId, newName.trim());
      toast.show("Renamed.");
      setRenamingId(null);
      router.refresh();
    });
  }

  function duplicate(id: string, name: string) {
    startTransition(async () => {
      await duplicateAnalysisAction(id, `${name} (Copy)`);
      toast.show("Duplicated.");
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this saved analysis?")) return;
    startTransition(async () => {
      await removeAnalysisAction(id);
      toast.show("Deleted.");
      router.refresh();
    });
  }

  if (analyses.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">No saved analyses yet — visit any property&apos;s Investment Analysis page to save one.</div>;
  }

  return (
    <div className="space-y-3">
      {analyses.map((a) => (
        <div key={a.id} className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              {renamingId === a.id ? (
                <div className="flex items-center gap-2">
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-primary" />
                  <button type="button" onClick={rename} disabled={isPending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                    Save
                  </button>
                </div>
              ) : (
                <Link href={`/customer/investments/${a.id}`} className="font-semibold text-ink hover:text-primary hover:underline">
                  {a.name}
                </Link>
              )}
              <p className="mt-0.5 text-xs text-muted">
                {a.propertyTitle || "Custom analysis"} {a.scenarioName ? `· ${a.scenarioName}` : ""} · {new Date(a.createdAt).toLocaleDateString("en-GB")}
              </p>
            </div>
            <div className="flex items-center gap-4 text-right text-xs">
              <div>
                <p className="text-muted-foreground">ROI</p>
                <p className="font-bold text-ink">{a.results.estimatedRoiPercent.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Net Yield</p>
                <p className="font-bold text-ink">{a.results.netRentalYieldPercent.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. Gain</p>
                <p className="font-bold text-ink">{formatPKR(a.results.estimatedGain)}</p>
              </div>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => startRename(a)} className="flex items-center gap-1 rounded-full border-2 border-ink/15 px-2.5 py-1 text-[11px] font-bold text-ink hover:border-primary">
              <Pencil className="h-3 w-3" /> Rename
            </button>
            <button type="button" onClick={() => duplicate(a.id, a.name)} disabled={isPending} className="flex items-center gap-1 rounded-full border-2 border-ink/15 px-2.5 py-1 text-[11px] font-bold text-ink hover:border-primary disabled:opacity-50">
              <Copy className="h-3 w-3" /> Duplicate
            </button>
            <button type="button" onClick={() => remove(a.id)} disabled={isPending} className="flex items-center gap-1 rounded-full border-2 border-primary/30 px-2.5 py-1 text-[11px] font-bold text-primary disabled:opacity-50">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
