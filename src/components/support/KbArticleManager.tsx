"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SupportKbArticle, SupportCategory, KbVisibility } from "@/lib/models/support";
import { kbVisibilities } from "@/lib/models/support";
import { createKbArticleAction, updateKbArticleAction } from "@/lib/actions/support.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-primary";

export function KbArticleManager({ articles, categories }: { articles: SupportKbArticle[]; categories: SupportCategory[] }) {
  const [title, setTitle] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [visibility, setVisibility] = useState<KbVisibility>("PUBLIC");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function create() {
    if (!title.trim() || !question.trim() || !answer.trim()) {
      toast.show("Please fill in title, question and answer.");
      return;
    }
    startTransition(async () => {
      try {
        await createKbArticleAction({ title: title.trim(), question: question.trim(), answer: answer.trim(), categoryCode: categoryCode || undefined, visibility });
        toast.show("Article created as draft.");
        setTitle("");
        setQuestion("");
        setAnswer("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this article.");
      }
    });
  }

  function togglePublished(article: SupportKbArticle) {
    startTransition(async () => {
      try {
        await updateKbArticleAction(article.id, { published: !article.published });
        toast.show(article.published ? "Unpublished." : "Published.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this article.");
      }
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2">
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        <select value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} className={inputClass}>
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <input placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)} className={`${inputClass} sm:col-span-2`} />
        <textarea placeholder="Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} className={`${inputClass} sm:col-span-2`} />
        <select value={visibility} onChange={(e) => setVisibility(e.target.value as KbVisibility)} className={inputClass}>
          {kbVisibilities.map((v) => (
            <option key={v} value={v}>
              {v.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button type="button" onClick={create} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          Create Draft Article
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {articles.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-bold text-ink">{a.title}</p>
              <p className="text-xs text-muted">
                {a.categoryLabel ?? "Uncategorized"} · {a.visibility} · {a.helpfulCount} helpful / {a.notHelpfulCount} not helpful
              </p>
            </div>
            <button type="button" disabled={isPending} onClick={() => togglePublished(a)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${a.published ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>
              {a.published ? "Published" : "Draft"}
            </button>
          </div>
        ))}
        {articles.length === 0 && <p className="text-sm text-muted">No knowledge-base articles yet.</p>}
      </div>
    </div>
  );
}
