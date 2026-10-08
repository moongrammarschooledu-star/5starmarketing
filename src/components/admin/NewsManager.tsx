"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { createNewsAction, deleteNewsAction, setNewsActiveAction, updateNewsAction } from "@/lib/actions/news.actions";
import { NEWS_MAX, type SiteNews, type TickerItem } from "@/lib/models/news";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

function status(n: SiteNews): { label: string; className: string } {
  if (!n.isActive) return { label: "Hidden", className: "bg-surface-muted text-muted" };
  if (n.expiresAt && Date.parse(n.expiresAt) < Date.now()) return { label: "Ended", className: "bg-amber-100 text-amber-700" };
  return { label: "Live", className: "bg-success/10 text-success" };
}

/** "2026-10-31T18:59:59.000Z" -> the Pakistan calendar day, "2026-10-31". */
function toPkDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(Date.parse(iso) + 5 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export function NewsManager({ news, demandItems }: { news: SiteNews[]; demandItems: TickerItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setEditingId(null);
    setMessage("");
    setLinkUrl("");
    setExpiresOn("");
    setIsActive(true);
    setError(null);
  }

  function edit(n: SiteNews) {
    setEditingId(n.id);
    setMessage(n.message);
    setLinkUrl(n.linkUrl ?? "");
    setExpiresOn(toPkDate(n.expiresAt));
    setIsActive(n.isActive);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const form = { message, linkUrl, isActive, expiresOn };
      const result = editingId ? await updateNewsAction(editingId, form) : await createNewsAction(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      reset();
      router.refresh();
    });
  }

  function toggle(n: SiteNews) {
    startTransition(async () => {
      const result = await setNewsActiveAction(n.id, !n.isActive);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  function remove(n: SiteNews) {
    if (!confirm("Delete this news permanently?")) return;
    startTransition(async () => {
      const result = await deleteNewsAction(n.id);
      if (!result.ok) setError(result.error);
      if (editingId === n.id) reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-heading text-sm font-bold text-ink">{editingId ? "Edit News" : "Add News"}</h2>
        <p className="mt-1 text-xs text-muted">
          Appears in the scrolling bar at the top of the public website, together with the client demands. Keep it short.
        </p>
        {error && <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">{error}</p>}

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={NEWS_MAX}
          placeholder="e.g. New 5 Marla plots available in Bahria Town - call us today!"
          className={`${inputClass} mt-3 resize-none`}
        />
        <p className="mt-1 text-right text-[11px] text-muted">{NEWS_MAX - message.length} characters left</p>

        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink">
            Link (optional)
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/properties  or  https://..." className={`${inputClass} font-normal`} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink">
            Show until (optional)
            <input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} className={`${inputClass} font-normal`} />
          </label>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-border text-primary" />
          Show on the website
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={pending} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            {pending ? "Saving..." : editingId ? "Save Changes" : "Add News"}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="rounded-full border-2 border-ink/15 px-5 py-2 text-xs font-bold text-ink">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-heading text-sm font-bold text-ink">Your News</h2>
        {news.map((n) => {
          const s = status(n);
          return (
            <div key={n.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-ink">{n.message}</p>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${s.className}`}>{s.label}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {n.linkUrl ? `Link: ${n.linkUrl} - ` : ""}
                {n.expiresAt ? `Until ${toPkDate(n.expiresAt)}` : "No end date"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => edit(n)} className="flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-ink">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button type="button" onClick={() => toggle(n)} disabled={pending} className="flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-ink">
                  {n.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {n.isActive ? "Hide" : "Show"}
                </button>
                <button type="button" onClick={() => remove(n)} disabled={pending} className="flex items-center gap-1 rounded-full border-2 border-danger/30 px-3 py-1.5 text-xs font-bold text-danger">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          );
        })}
        {news.length === 0 && <p className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted">No news yet. Add the first one above.</p>}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-heading text-sm font-bold text-ink">Client demands on the website right now</h2>
        <p className="mt-1 text-xs text-muted">
          These are added automatically from your <Link href="/admin/demands" className="font-semibold text-primary hover:underline">Demands</Link>. Visitors never see the
          client&apos;s name, phone or notes. Waiting demands stay up for 60 days (latest 20). To keep one off the website, untick &quot;Show on the website news bar&quot; when you
          edit that demand.
        </p>
        <ul className="mt-3 space-y-2">
          {demandItems.map((d) => (
            <li key={d.id} className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-ink">
              <span className="mr-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-primary">Wanted</span>
              {d.text}
            </li>
          ))}
        </ul>
        {demandItems.length === 0 && <p className="mt-3 text-sm text-muted">No client demands are showing at the moment.</p>}
      </div>
    </div>
  );
}
