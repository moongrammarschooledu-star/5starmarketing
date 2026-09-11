"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Tag as TagIcon } from "lucide-react";
import type { MarketingTag } from "@/lib/models/marketingTag";
import { createTagAction, removeTagAction } from "@/lib/actions/marketingAutomation.actions";
import { useToast } from "@/components/admin/ToastProvider";

const SUGGESTED = ["Investor", "Buyer", "Seller", "Rental", "Commercial", "Residential", "Hot Lead", "VIP", "First Time Buyer", "Site Visit Interested", "High Budget"];

export function TagManager({ tags }: { tags: MarketingTag[] }) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function create(tagName: string) {
    if (!tagName.trim()) return;
    startTransition(async () => {
      try {
        await createTagAction({ name: tagName.trim() });
        toast.show("Tag created.");
        setName("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this tag.");
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this tag? It will be removed from every lead.")) return;
    startTransition(async () => {
      await removeTagAction(id);
      toast.show("Tag deleted.");
      router.refresh();
    });
  }

  const existingNames = new Set(tags.map((t) => t.name.toLowerCase()));
  const suggestions = SUGGESTED.filter((s) => !existingNames.has(s.toLowerCase()));

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <TagIcon className="h-4.5 w-4.5 text-primary" /> Tags
      </h2>
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create(name)}
          placeholder="New tag name"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
        />
        <button type="button" onClick={() => create(name)} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => create(s)} className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-muted hover:bg-primary/10 hover:text-primary">
              + {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.length === 0 && <p className="text-sm text-muted">No tags yet.</p>}
        {tags.map((t) => (
          <span key={t.id} className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink">
            {t.name}
            <button type="button" onClick={() => remove(t.id)} disabled={isPending} className="text-muted hover:text-primary">
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
