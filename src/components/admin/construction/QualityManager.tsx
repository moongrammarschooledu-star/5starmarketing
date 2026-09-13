"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { ConstructionQualityInspection, ConstructionQualityInspectionInput, ConstructionQualityIssue, ConstructionQualityIssueInput, QualityCategory, QualityResult, QualityIssueStatus } from "@/lib/models/construction";
import { qualityCategories, qualityResults, qualityIssueStatuses } from "@/lib/models/construction";
import { createQualityInspectionAction, setQualityResultAction, createQualityIssueAction, updateQualityIssueStatusAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function QualityManager({
  projectId,
  inspections,
  issuesByInspection,
  phases,
}: {
  projectId: string;
  inspections: ConstructionQualityInspection[];
  issuesByInspection: Record<string, ConstructionQualityIssue[]>;
  phases: { id: string; name: string }[];
}) {
  return (
    <div className="mt-3">
      <NewInspectionForm projectId={projectId} phases={phases} />
      <div className="mt-4 space-y-2">
        {inspections.map((i) => (
          <InspectionRow key={i.id} projectId={projectId} inspection={i} issues={issuesByInspection[i.id] ?? []} />
        ))}
        {inspections.length === 0 && <p className="text-sm text-muted">No quality inspections recorded yet.</p>}
      </div>
    </div>
  );
}

function NewInspectionForm({ projectId, phases }: { projectId: string; phases: { id: string; name: string }[] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<ConstructionQualityInspectionInput>>({ category: "Other" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof ConstructionQualityInspectionInput>(key: K, value: ConstructionQualityInspectionInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    startTransition(async () => {
      try {
        await createQualityInspectionAction(projectId, form as ConstructionQualityInspectionInput);
        toast.show("Inspection recorded.");
        setForm({ category: "Other" });
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this inspection.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="font-heading text-base font-bold text-ink">New Quality Inspection</span>
        {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
      </button>
      {showForm && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select value={form.category ?? "Other"} onChange={(e) => set("category", e.target.value as QualityCategory)} className={inputClass}>
              {qualityCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select value={form.phaseId ?? ""} onChange={(e) => set("phaseId", e.target.value)} className={inputClass}>
              <option value="">No phase</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input type="date" value={form.inspectionDate ?? ""} onChange={(e) => set("inspectionDate", e.target.value)} className={inputClass} />
            <select value={form.result ?? "REQUIRES_REVIEW"} onChange={(e) => set("result", e.target.value as QualityResult)} className={inputClass}>
              {qualityResults.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <textarea placeholder="Notes" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className={`${inputClass} min-h-14 sm:col-span-2`} />
          </div>
          <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Record Inspection
          </button>
        </div>
      )}
    </div>
  );
}

function InspectionRow({ projectId, inspection, issues }: { projectId: string; inspection: ConstructionQualityInspection; issues: ConstructionQualityIssue[] }) {
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueForm, setIssueForm] = useState<Partial<ConstructionQualityIssueInput>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function setResult(result: QualityResult) {
    startTransition(async () => {
      try {
        await setQualityResultAction(inspection.id, projectId, result);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this inspection.");
      }
    });
  }

  function addIssue() {
    if (!issueForm.description?.trim()) {
      toast.show("Please describe the issue.");
      return;
    }
    startTransition(async () => {
      try {
        await createQualityIssueAction(inspection.id, projectId, issueForm as ConstructionQualityIssueInput);
        toast.show("Issue logged.");
        setIssueForm({});
        setShowIssueForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not log this issue.");
      }
    });
  }

  function setIssueStatus(issueId: string, status: QualityIssueStatus) {
    startTransition(async () => {
      await updateQualityIssueStatusAction(issueId, projectId, status);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">
            {inspection.category} {inspection.phaseName ? `· ${inspection.phaseName}` : ""}
          </p>
          <p className="text-xs text-muted">
            {new Date(inspection.inspectionDate).toLocaleDateString("en-GB")} {inspection.inspectorName ? `· ${inspection.inspectorName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={inspection.result} />
          <select value={inspection.result} onChange={(e) => setResult(e.target.value as QualityResult)} disabled={isPending} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary">
            {qualityResults.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>
      {inspection.notes && <p className="mt-2 text-xs text-muted">{inspection.notes}</p>}

      <div className="mt-3 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Defects / Issues</span>
          <button type="button" onClick={() => setShowIssueForm((v) => !v)} className="text-xs font-bold text-primary hover:underline">
            {showIssueForm ? "Cancel" : "Log Issue"}
          </button>
        </div>
        {showIssueForm && (
          <div className="mt-2 space-y-2">
            <textarea placeholder="Description" value={issueForm.description ?? ""} onChange={(e) => setIssueForm((p) => ({ ...p, description: e.target.value }))} className={`${inputClass} min-h-14 w-full`} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input placeholder="Corrective Action" value={issueForm.correctiveAction ?? ""} onChange={(e) => setIssueForm((p) => ({ ...p, correctiveAction: e.target.value }))} className={inputClass} />
              <input placeholder="Responsible Party" value={issueForm.responsibleParty ?? ""} onChange={(e) => setIssueForm((p) => ({ ...p, responsibleParty: e.target.value }))} className={inputClass} />
              <input type="date" value={issueForm.dueDate ?? ""} onChange={(e) => setIssueForm((p) => ({ ...p, dueDate: e.target.value }))} className={inputClass} />
            </div>
            <button type="button" onClick={addIssue} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
              Save Issue
            </button>
          </div>
        )}
        <div className="mt-2 space-y-1.5">
          {issues.map((issue) => (
            <div key={issue.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-ink">{issue.description}</p>
                <p className="text-[11px] text-muted">
                  {issue.correctiveAction ?? "No corrective action noted"} {issue.responsibleParty ? `· ${issue.responsibleParty}` : ""} {issue.dueDate ? `· Due ${new Date(issue.dueDate).toLocaleDateString("en-GB")}` : ""}
                </p>
              </div>
              <select value={issue.status} onChange={(e) => setIssueStatus(issue.id, e.target.value as QualityIssueStatus)} disabled={isPending} className="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] text-ink outline-none focus:border-primary">
                {qualityIssueStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {issues.length === 0 && <p className="text-xs text-muted">No issues logged.</p>}
        </div>
      </div>
    </div>
  );
}
