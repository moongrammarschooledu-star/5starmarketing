"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileDown } from "lucide-react";
import { generateProgressReportPdfAction } from "@/lib/actions/construction.actions";
import { getDocumentSignedUrlAction } from "@/lib/actions/documents.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function GenerateProgressReportButton({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function generate() {
    startTransition(async () => {
      try {
        const doc = await generateProgressReportPdfAction(projectId);
        const url = await getDocumentSignedUrlAction(doc.id, "Downloaded");
        window.open(url, "_blank", "noopener,noreferrer");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not generate this report.");
      }
    });
  }

  return (
    <button type="button" onClick={generate} disabled={isPending} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
      <FileDown className="h-3.5 w-3.5" /> Generate Progress Report PDF
    </button>
  );
}
