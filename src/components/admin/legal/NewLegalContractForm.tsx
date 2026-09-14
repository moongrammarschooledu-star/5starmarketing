"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LegalContractType } from "@/lib/models/legal";
import { legalContractTypes } from "@/lib/models/legal";
import { createLegalContractAction } from "@/lib/actions/legal.actions";
import { listPropertyDocumentsAction } from "@/lib/actions/legal-support.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function NewLegalContractForm({ properties, defaultPropertyId }: { properties: { id: string; title: string }[]; defaultPropertyId?: string }) {
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? "");
  const [contractType, setContractType] = useState<LegalContractType>("SALE");
  const [documentId, setDocumentId] = useState("");
  const [documents, setDocuments] = useState<{ id: string; title: string }[]>([]);
  const [expiryDate, setExpiryDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!propertyId) {
      setDocuments([]);
      return;
    }
    listPropertyDocumentsAction(propertyId).then(setDocuments).catch(() => setDocuments([]));
  }, [propertyId]);

  function create() {
    if (!documentId) {
      toast.show("Please choose the document this contract wraps.");
      return;
    }
    startTransition(async () => {
      try {
        await createLegalContractAction({ propertyId: propertyId || undefined, contractType, documentId, expiryDate: expiryDate || undefined });
        toast.show("Contract created.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this contract.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-bold text-ink">New Contract</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inputClass}>
          <option value="">No specific property</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <select value={contractType} onChange={(e) => setContractType(e.target.value as LegalContractType)} className={inputClass}>
          {legalContractTypes.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select value={documentId} onChange={(e) => setDocumentId(e.target.value)} className={inputClass}>
          <option value="">Choose the contract document…</option>
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
        <input type="date" placeholder="Expiry date (optional)" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputClass} />
      </div>
      <p className="mt-2 text-xs text-muted">The document must already be uploaded (via Properties &rarr; Legal Documents, or Documents) before it can be wrapped in a contract.</p>
      <button type="button" onClick={create} disabled={isPending} className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
        Create Contract
      </button>
    </div>
  );
}
