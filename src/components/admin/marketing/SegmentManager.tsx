"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Eye, Users } from "lucide-react";
import type { MarketingSegment, SegmentCondition, SegmentConditionField } from "@/lib/models/marketingTag";
import { segmentConditionFields } from "@/lib/models/marketingTag";
import { createSegmentAction, removeSegmentAction, previewSegmentAction } from "@/lib/actions/marketingAutomation.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { Modal } from "@/components/admin/Modal";

type PreviewLead = { id: string; name: string; phone: string; status: string; score: number; scoreLevel: string };

export function SegmentManager({ segments }: { segments: MarketingSegment[] }) {
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [conditions, setConditions] = useState<SegmentCondition[]>([]);
  const [previewFor, setPreviewFor] = useState<MarketingSegment | null>(null);
  const [previewLeads, setPreviewLeads] = useState<PreviewLead[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function addCondition() {
    setConditions((prev) => [...prev, { field: "scoreLevel", operator: "eq", value: "HOT" }]);
  }

  function updateCondition(i: number, patch: Partial<SegmentCondition>) {
    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function create() {
    if (!name.trim()) {
      toast.show("Please enter a segment name.");
      return;
    }
    setShowNew(false);
    startTransition(async () => {
      await createSegmentAction({ name: name.trim(), conditions });
      toast.show("Segment created.");
      setName("");
      setConditions([]);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this segment?")) return;
    startTransition(async () => {
      await removeSegmentAction(id);
      toast.show("Segment deleted.");
      router.refresh();
    });
  }

  function preview(segment: MarketingSegment) {
    setPreviewFor(segment);
    startTransition(async () => {
      const leads = await previewSegmentAction(segment.id);
      setPreviewLeads(leads);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
          <Users className="h-4.5 w-4.5 text-primary" /> Audience Segments
        </h2>
        <button type="button" onClick={() => setShowNew(true)} className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> New Segment
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">Saved filter definitions, resolved against live lead data every time they&apos;re viewed — never a stale snapshot.</p>

      <div className="mt-4 space-y-2">
        {segments.length === 0 && <p className="text-sm text-muted">No segments yet.</p>}
        {segments.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted p-3 text-sm">
            <div>
              <p className="font-semibold text-ink">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.conditions.length} condition(s)</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => preview(s)} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3 py-1.5 text-[11px] font-bold text-ink hover:border-primary hover:text-primary">
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
              <button type="button" onClick={() => remove(s.id)} disabled={isPending} className="flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Segment">
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <div className="space-y-2">
            {conditions.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr] gap-2 rounded-lg border border-border p-2.5">
                <select value={c.field} onChange={(e) => updateCondition(i, { field: e.target.value as SegmentConditionField })} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary">
                  {segmentConditionFields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <select value={c.operator} onChange={(e) => updateCondition(i, { operator: e.target.value as SegmentCondition["operator"] })} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary">
                  {["eq", "neq", "gt", "gte", "lt", "lte", "in"].map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={Array.isArray(c.value) ? c.value.join(",") : String(c.value)}
                  onChange={(e) => updateCondition(i, { value: c.operator === "in" ? e.target.value.split(",").map((s) => s.trim()) : e.target.value })}
                  className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary"
                />
              </div>
            ))}
            <button type="button" onClick={addCondition} className="text-xs font-bold text-primary hover:underline">
              + Add Condition
            </button>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setShowNew(false)} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink">
            Cancel
          </button>
          <button type="button" onClick={create} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Create
          </button>
        </div>
      </Modal>

      <Modal open={!!previewFor} onClose={() => setPreviewFor(null)} title={`Preview: ${previewFor?.name ?? ""}`}>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {previewLeads.length === 0 && <p className="text-sm text-muted">No matching leads.</p>}
          {previewLeads.map((l) => (
            <Link key={l.id} href={`/admin/crm/leads/${l.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted p-2.5 text-sm hover:bg-primary/5">
              <span className="font-semibold text-ink">{l.name}</span>
              <span className="text-xs text-muted">
                {l.status} · {l.scoreLevel} ({l.score})
              </span>
            </Link>
          ))}
        </div>
      </Modal>
    </div>
  );
}
