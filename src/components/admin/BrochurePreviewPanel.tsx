"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Download, X, CheckCircle2, AlertCircle } from "lucide-react";
import type { Brochure } from "@/lib/models/brochure";
import { brochureSectionKeys, brochureSectionLabels, type BrochureSectionKey } from "@/lib/models/brochure";
import { updateBrochureAction, generateBrochurePdfAction, setBrochurePublicAction } from "@/lib/actions/brochure.actions";
import { useToast } from "./ToastProvider";

export function BrochurePreviewPanel({ brochure }: { brochure: Brochure }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(brochure.title);
  const [sections, setSections] = useState<BrochureSectionKey[]>(brochure.selectedSections);
  const [isPending, startTransition] = useTransition();
  const [generateError, setGenerateError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  function toggleSection(key: BrochureSectionKey) {
    setSections((list) => (list.includes(key) ? list.filter((s) => s !== key) : [...list, key]));
  }

  function saveEdit() {
    startTransition(async () => {
      await updateBrochureAction(brochure.id, title, sections);
      toast.show("Brochure updated.");
      setEditing(false);
      router.refresh();
    });
  }

  function generate() {
    setGenerateError(null);
    startTransition(async () => {
      const result = await generateBrochurePdfAction(brochure.id);
      if (result.ok) {
        toast.show("PDF generated.");
        router.refresh();
      } else {
        setGenerateError(result.error ?? "Could not generate the PDF.");
      }
    });
  }

  function togglePublic() {
    startTransition(async () => {
      await setBrochurePublicAction(brochure.id, !brochure.public);
      toast.show(brochure.public ? "Brochure unpublished." : "Brochure published.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold text-ink">{brochure.title}</h2>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${brochure.public ? "bg-primary/10 text-primary" : "bg-muted/20 text-muted"}`}>
          {brochure.public ? "Public" : "Private"}
        </span>
      </div>

      {generateError && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs font-semibold text-primary">
          <AlertCircle className="h-4 w-4 shrink-0" /> {generateError}
        </div>
      )}
      {brochure.generatedFile && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-3 py-2.5 text-xs font-semibold text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> PDF generated and saved.
        </div>
      )}

      {editing ? (
        <div className="mt-4 space-y-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {brochureSectionKeys.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={sections.includes(key)}
                  onChange={() => toggleSection(key)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                {brochureSectionLabels[key]}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={saveEdit}
              className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border-2 border-ink/15 px-5 py-2 text-xs font-bold text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2.5 text-xs font-bold text-ink hover:border-primary hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={generate}
            className="rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {isPending ? "Generating..." : "Generate PDF"}
          </button>
          {brochure.generatedFile && (
            <a
              href={brochure.generatedFile}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full border-2 border-success/40 px-4 py-2.5 text-xs font-bold text-success hover:bg-success/5"
            >
              <Download className="h-3.5 w-3.5" /> Download PDF
            </a>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={togglePublic}
            className="rounded-full border-2 border-ink/15 px-4 py-2.5 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-60"
          >
            {brochure.public ? "Unpublish" : "Publish Publicly"}
          </button>
          <Link
            href="/admin/brochures"
            className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2.5 text-xs font-bold text-ink hover:border-primary hover:text-primary"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </Link>
        </div>
      )}
    </div>
  );
}
