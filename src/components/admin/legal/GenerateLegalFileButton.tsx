"use client";

import { useTransition } from "react";
import { FileDown } from "lucide-react";
import { generatePropertyLegalFileAction } from "@/lib/actions/legal.actions";
import { getDocumentSignedUrlAction } from "@/lib/actions/documents.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function GenerateLegalFileButton({ propertyId }: { propertyId: string }) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function generate() {
    startTransition(async () => {
      try {
        const doc = await generatePropertyLegalFileAction(propertyId);
        const url = await getDocumentSignedUrlAction(doc.id, "Downloaded");
        window.open(url, "_blank", "noopener,noreferrer");
        toast.show("Property Legal File generated.");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not generate this file.");
      }
    });
  }

  return (
    <button type="button" onClick={generate} disabled={isPending} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
      <FileDown className="h-3.5 w-3.5" /> {isPending ? "Generating…" : "Generate Legal File PDF"}
    </button>
  );
}
