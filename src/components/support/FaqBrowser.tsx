"use client";

import { useState, useTransition } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import type { SupportKbArticle } from "@/lib/models/support";
import { recordKbFeedbackAction } from "@/lib/actions/support.actions";

export function FaqBrowser({ articles }: { articles: SupportKbArticle[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [rated, setRated] = useState<Set<string>>(new Set());
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Local feedback only — this component is shared with the PUBLIC
  // /support/faq page, which (unlike the admin/customer panels) has no
  // ToastProvider in its layout.
  function rate(articleId: string, helpful: boolean) {
    setFeedbackError(null);
    startTransition(async () => {
      try {
        await recordKbFeedbackAction(articleId, helpful);
        setRated((prev) => new Set(prev).add(articleId));
      } catch {
        setFeedbackError("Could not record your feedback.");
      }
    });
  }

  return (
    <div className="space-y-2">
      {articles.map((a) => (
        <div key={a.id} className="rounded-2xl border border-border bg-surface p-4">
          <button type="button" onClick={() => setOpenId(openId === a.id ? null : a.id)} className="flex w-full items-center justify-between text-left">
            <span className="text-sm font-bold text-ink">{a.question}</span>
          </button>
          {openId === a.id && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-sm text-ink">{a.answer}</p>
              {rated.has(a.id) ? (
                <p className="mt-3 text-xs font-semibold text-success">Thanks for the feedback.</p>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-muted">Was this helpful?</span>
                  <button type="button" disabled={isPending} onClick={() => rate(a.id, true)} className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
                    <ThumbsUp className="h-3 w-3" /> Yes
                  </button>
                  <button type="button" disabled={isPending} onClick={() => rate(a.id, false)} className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
                    <ThumbsDown className="h-3 w-3" /> No
                  </button>
                </div>
              )}
              {feedbackError && <p className="mt-1 text-xs font-semibold text-primary">{feedbackError}</p>}
            </div>
          )}
        </div>
      ))}
      {articles.length === 0 && <p className="text-sm text-muted">No articles found.</p>}
    </div>
  );
}
