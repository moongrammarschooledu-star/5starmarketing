"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { generateInspectionReportAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function GenerateInspectionReportButton({ inspectionId, hasDocument }: { inspectionId: string; hasDocument: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function generate() {
    startTransition(async () => {
      try {
        await generateInspectionReportAction(inspectionId);
        toast.show("Inspection report generated and saved to the document vault.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not generate this report.");
      }
    });
  }

  return (
    <button type="button" onClick={generate} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
      <FileText className="h-3.5 w-3.5" /> {isPending ? "Generating..." : hasDocument ? "Regenerate Report" : "Generate Report"}
    </button>
  );
}
