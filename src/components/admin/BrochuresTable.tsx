"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Download, Trash2, RefreshCw, Globe, Building2, FolderKanban } from "lucide-react";
import type { BrochureSummary } from "@/lib/models/brochure";
import { generateBrochurePdfAction, setBrochurePublicAction, deleteBrochureAction } from "@/lib/actions/brochure.actions";
import { ConfirmDialog, useConfirmDelete } from "./ConfirmDialog";
import { useToast } from "./ToastProvider";

export function BrochuresTable({ brochures }: { brochures: BrochureSummary[] }) {
  const [isPending, startTransition] = useTransition();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const del = useConfirmDelete<BrochureSummary>(async (id) => {
    await deleteBrochureAction(id);
    toast.show("Brochure deleted.");
    router.refresh();
  });

  function generate(id: string) {
    setGeneratingId(id);
    startTransition(async () => {
      const result = await generateBrochurePdfAction(id);
      setGeneratingId(null);
      if (result.ok) {
        toast.show("PDF generated.");
        router.refresh();
      } else {
        toast.show(result.error ?? "Could not generate the PDF.", "error");
      }
    });
  }

  function togglePublic(b: BrochureSummary) {
    startTransition(async () => {
      await setBrochurePublicAction(b.id, !b.public);
      toast.show(b.public ? "Brochure unpublished." : "Brochure published.");
      router.refresh();
    });
  }

  if (brochures.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted">
        No brochures created yet.
      </div>
    );
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface lg:block">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">For</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">PDF Status</th>
              <th className="px-4 py-3">Public</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {brochures.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3 font-semibold text-ink">{b.title}</td>
                <td className="max-w-[180px] px-4 py-3 text-muted"><span className="line-clamp-1">{b.targetName}</span></td>
                <td className="px-4 py-3 text-muted">
                  <span className="flex items-center gap-1.5">
                    {b.type === "property" ? <Building2 className="h-3.5 w-3.5" /> : <FolderKanban className="h-3.5 w-3.5" />}
                    {b.type === "property" ? "Property" : "Project"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${b.generatedFile ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>
                    {b.generatedFile ? "Generated" : "Not Generated"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => togglePublic(b)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${b.public ? "bg-primary/10 text-primary" : "bg-muted/20 text-muted"}`}
                  >
                    {b.public ? "Public" : "Private"}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                  {new Date(b.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/admin/brochures/preview/${b.id}`}
                      title="Preview"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      title="Generate PDF"
                      disabled={isPending && generatingId === b.id}
                      onClick={() => generate(b.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                    >
                      <RefreshCw className={`h-4 w-4 ${generatingId === b.id ? "animate-spin" : ""}`} />
                    </button>
                    {b.generatedFile && (
                      <a
                        href={b.generatedFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-success hover:border-success"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                    {b.public && b.targetSlug && (
                      <Link
                        href={`/brochure/${b.slug}`}
                        target="_blank"
                        title="View Public Page"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-primary hover:border-primary"
                      >
                        <Globe className="h-4 w-4" />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => del.open(b)}
                      title="Delete"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {brochures.map((b) => (
          <div key={b.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-ink">{b.title}</div>
                <div className="mt-0.5 text-xs text-muted">{b.targetName}</div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${b.generatedFile ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>
                {b.generatedFile ? "Generated" : "Not Generated"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href={`/admin/brochures/preview/${b.id}`} className="flex items-center justify-center gap-1 rounded-full border-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink">
                <Eye className="h-3.5 w-3.5" /> Preview
              </Link>
              <button
                type="button"
                onClick={() => generate(b.id)}
                className="flex items-center justify-center gap-1 rounded-full border-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${generatingId === b.id ? "animate-spin" : ""}`} /> Generate
              </button>
              {b.generatedFile && (
                <a href={b.generatedFile} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 rounded-full bg-success px-3 py-2 text-xs font-bold text-white">
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              )}
              <button
                type="button"
                onClick={() => del.open(b)}
                className="flex items-center justify-center gap-1 rounded-full border-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!del.target}
        message="Delete this brochure? Its generated PDF will also be removed."
        confirmLabel="Delete Brochure"
        busy={del.busy}
        onConfirm={del.confirm}
        onClose={del.close}
      />
    </div>
  );
}
