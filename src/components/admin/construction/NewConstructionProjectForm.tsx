"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { constructionProjectTypes, type ConstructionProjectType } from "@/lib/models/construction";
import { createConstructionProjectAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function NewConstructionProjectForm({
  properties,
  referenceProjects,
  customers,
  staff,
}: {
  properties: { id: string; title: string }[];
  referenceProjects: { id: string; name: string }[];
  customers: { id: string; fullName: string }[];
  staff: { id: string; name: string }[];
}) {
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState<ConstructionProjectType>("Residential Construction");
  const [propertyId, setPropertyId] = useState("");
  const [referenceProjectId, setReferenceProjectId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [plannedCompletionDate, setPlannedCompletionDate] = useState("");
  const [projectManagerId, setProjectManagerId] = useState("");
  const [siteManagerId, setSiteManagerId] = useState("");
  const [approvedBudget, setApprovedBudget] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit() {
    if (!projectName.trim()) {
      toast.show("Please enter a project name.");
      return;
    }
    startTransition(async () => {
      try {
        const project = await createConstructionProjectAction({
          projectName: projectName.trim(),
          projectType,
          propertyId: propertyId || undefined,
          referenceProjectId: referenceProjectId || undefined,
          customerId: customerId || undefined,
          location: location || undefined,
          startDate: startDate || undefined,
          plannedCompletionDate: plannedCompletionDate || undefined,
          projectManagerId: projectManagerId || undefined,
          siteManagerId: siteManagerId || undefined,
          approvedBudget: approvedBudget ? Number(approvedBudget) : undefined,
          contractValue: contractValue ? Number(contractValue) : undefined,
          description: description || undefined,
        });
        toast.show("Construction project created.");
        router.push(`/admin/construction/projects/${project.id}/overview`);
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this project.");
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-4 rounded-2xl border border-border bg-surface p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Project Name *">
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Project Type">
          <select value={projectType} onChange={(e) => setProjectType(e.target.value as ConstructionProjectType)} className={inputClass}>
            {constructionProjectTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Property (optional)">
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inputClass}>
            <option value="">None</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reference Development Project (optional)">
          <select value={referenceProjectId} onChange={(e) => setReferenceProjectId(e.target.value)} className={inputClass}>
            <option value="">None</option>
            {referenceProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Customer / Client (optional)">
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClass}>
            <option value="">None</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location">
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Project Manager">
          <select value={projectManagerId} onChange={(e) => setProjectManagerId(e.target.value)} className={inputClass}>
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Site Manager">
          <select value={siteManagerId} onChange={(e) => setSiteManagerId(e.target.value)} className={inputClass}>
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start Date">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Planned Completion Date">
          <input type="date" value={plannedCompletionDate} onChange={(e) => setPlannedCompletionDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Approved Budget (PKR)">
          <input type="number" value={approvedBudget} onChange={(e) => setApprovedBudget(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Contract Value (PKR)">
          <input type="number" value={contractValue} onChange={(e) => setContractValue(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} min-h-20`} />
      </Field>
      <button type="button" onClick={submit} disabled={isPending} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {isPending ? "Creating..." : "Create Construction Project"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
