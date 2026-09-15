"use client";

import { useState, useTransition } from "react";
import { createAiKnowledgeSourceAction, updateAiKnowledgeSourceAction, deleteAiKnowledgeSourceAction } from "@/lib/actions/ai.actions";
import type { AiKnowledgeSource } from "@/lib/models/ai";

export function KnowledgePanel({ initialSources, readOnly }: { initialSources: AiKnowledgeSource[]; readOnly: boolean }) {
  const [sources, setSources] = useState(initialSources);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"INTERNAL" | "CUSTOMER">("INTERNAL");
  const [pending, startTransition] = useTransition();

  function create() {
    if (!title.trim() || !content.trim()) return;
    startTransition(async () => {
      const source = await createAiKnowledgeSourceAction({
        title,
        content,
        sourceType: "MANUAL",
        department: null,
        visibility,
        isPublished: false,
      });
      setSources((prev) => [source, ...prev]);
      setTitle("");
      setContent("");
    });
  }

  function togglePublish(s: AiKnowledgeSource) {
    startTransition(async () => {
      await updateAiKnowledgeSourceAction(s.id, { isPublished: !s.isPublished });
      setSources((prev) => prev.map((x) => (x.id === s.id ? { ...x, isPublished: !x.isPublished } : x)));
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteAiKnowledgeSourceAction(id);
      setSources((prev) => prev.filter((x) => x.id !== id));
    });
  }

  return (
    <div className="mt-6">
      {!readOnly && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="font-heading text-base font-bold text-ink">Add a source</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Content" rows={4} className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <div className="mt-2 flex items-center gap-3">
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as "INTERNAL" | "CUSTOMER")} className="rounded-lg border border-border px-3 py-2 text-sm">
              <option value="INTERNAL">Internal only</option>
              <option value="CUSTOMER">Customer-visible (when published)</option>
            </select>
            <button onClick={create} disabled={pending} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              Add
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {sources.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-heading text-sm font-bold text-ink">{s.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{s.content}</p>
                <p className="mt-2 text-xs text-muted">
                  {s.visibility} · {s.isPublished ? "Published" : "Draft"}
                </p>
              </div>
              {!readOnly && (
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => togglePublish(s)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-ink">
                    {s.isPublished ? "Unpublish" : "Publish"}
                  </button>
                  <button onClick={() => remove(s.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600">
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {sources.length === 0 && <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted">No knowledge sources yet.</p>}
      </div>
    </div>
  );
}
