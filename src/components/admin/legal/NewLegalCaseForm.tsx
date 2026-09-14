"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LegalCaseType } from "@/lib/models/legal";
import { legalCaseTypes } from "@/lib/models/legal";
import { createLegalCaseAction } from "@/lib/actions/legal.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function NewLegalCaseForm({ properties, defaultPropertyId }: { properties: { id: string; title: string }[]; defaultPropertyId?: string }) {
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? "");
  const [title, setTitle] = useState("");
  const [caseType, setCaseType] = useState<LegalCaseType>("CIVIL");
  const [courtOrForum, setCourtOrForum] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function create() {
    if (!title.trim()) {
      toast.show("Please enter a case title.");
      return;
    }
    startTransition(async () => {
      try {
        const legalCase = await createLegalCaseAction({ propertyId: propertyId || undefined, title: title.trim(), caseType, courtOrForum: courtOrForum || undefined });
        toast.show("Legal case opened.");
        router.push(`/admin/legal/cases/${legalCase.id}`);
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not open this case.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-bold text-ink">Open Legal Case</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input placeholder="Case title" value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} sm:col-span-2`} />
        <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inputClass}>
          <option value="">No specific property</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <select value={caseType} onChange={(e) => setCaseType(e.target.value as LegalCaseType)} className={inputClass}>
          {legalCaseTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input placeholder="Court / forum (optional)" value={courtOrForum} onChange={(e) => setCourtOrForum(e.target.value)} className={inputClass} />
      </div>
      <button type="button" onClick={create} disabled={isPending} className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
        Open Case
      </button>
    </div>
  );
}
