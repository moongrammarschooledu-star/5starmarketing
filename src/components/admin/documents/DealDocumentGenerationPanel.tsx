"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Sparkles } from "lucide-react";
import type { DocumentTemplate } from "@/lib/models/document";
import { generateBookingFormAction, generateAgreementAction } from "@/lib/actions/documents.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function DealDocumentGenerationPanel({ dealId, templates }: { dealId: string; templates: DocumentTemplate[] }) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function generateBookingForm() {
    startTransition(async () => {
      try {
        await generateBookingFormAction(dealId);
        toast.show("Booking form generated.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not generate the booking form.");
      }
    });
  }

  function generateAgreement() {
    if (!templateId) {
      toast.show("Please select a template first.");
      return;
    }
    startTransition(async () => {
      try {
        await generateAgreementAction(templateId, dealId);
        toast.show("Agreement generated.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not generate this agreement.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <Sparkles className="h-4.5 w-4.5 text-primary" /> Generate Documents
      </h2>
      <p className="mt-1 text-xs text-muted">Documents are generated directly from this deal&apos;s real data — financial values cannot be edited during generation.</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={generateBookingForm} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          <FileText className="h-4 w-4" /> Generate Booking Form
        </button>
      </div>

      {templates.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={generateAgreement} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
            <FileText className="h-4 w-4" /> Generate Agreement
          </button>
        </div>
      )}
      {templates.length === 0 && <p className="mt-3 text-xs text-muted">No active templates yet — create one under Document Templates.</p>}
    </div>
  );
}
