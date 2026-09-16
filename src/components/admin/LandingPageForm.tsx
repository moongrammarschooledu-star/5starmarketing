"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createLandingPageAction, updateLandingPageAction, deleteLandingPageAction } from "@/lib/actions/content.actions";
import type { PublicLandingPage, PublicLandingPageInput, LandingPageFaqItem } from "@/lib/models/content";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function LandingPageForm({
  page,
  properties,
  projects,
}: {
  page?: PublicLandingPage;
  properties: { id: string; title: string }[];
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: page?.title ?? "",
    slug: page?.slug ?? "",
    heroImage: page?.heroImage ?? "",
    description: page?.description ?? "",
    propertyId: page?.propertyId ?? "",
    projectId: page?.projectId ?? "",
    ctaLabel: page?.ctaLabel ?? "Get In Touch",
    seoTitle: page?.seoTitle ?? "",
    seoDescription: page?.seoDescription ?? "",
    ogImage: page?.ogImage ?? "",
    campaignSource: page?.campaignSource ?? "",
    campaignMedium: page?.campaignMedium ?? "",
    campaignName: page?.campaignName ?? "",
    active: page?.active ?? true,
  });
  const [faqItems, setFaqItems] = useState<LandingPageFaqItem[]>(page?.faqItems ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    setError(null);
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required.");
      return;
    }
    const input: PublicLandingPageInput = {
      title: form.title.trim(),
      slug: form.slug.trim() || slugify(form.title),
      heroImage: form.heroImage.trim() || undefined,
      description: form.description,
      propertyId: form.propertyId || undefined,
      projectId: form.projectId || undefined,
      ctaLabel: form.ctaLabel.trim() || "Get In Touch",
      faqItems: faqItems.filter((f) => f.question.trim() && f.answer.trim()),
      seoTitle: form.seoTitle.trim() || undefined,
      seoDescription: form.seoDescription.trim() || undefined,
      ogImage: form.ogImage.trim() || undefined,
      campaignSource: form.campaignSource.trim() || undefined,
      campaignMedium: form.campaignMedium.trim() || undefined,
      campaignName: form.campaignName.trim() || undefined,
      active: form.active,
    };
    startTransition(async () => {
      try {
        if (page) {
          await updateLandingPageAction(page.id, input);
          router.refresh();
        } else {
          const created = await createLandingPageAction(input);
          router.push(`/admin/content/landing-pages/${created.id}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save this landing page.");
      }
    });
  }

  function remove() {
    if (!page) return;
    if (!confirm("Delete this landing page permanently?")) return;
    startTransition(async () => {
      await deleteLandingPageAction(page.id);
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold text-ink">Title</span>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink">Slug (used as /landing/&lt;slug&gt;)</span>
          <input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder={slugify(form.title)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-bold text-ink">Description</span>
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={5} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold text-ink">Hero Image URL</span>
          <input value={form.heroImage} onChange={(e) => set("heroImage", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink">CTA Label</span>
          <input value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink">Feature a Property (optional)</span>
          <select value={form.propertyId} onChange={(e) => set("propertyId", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">— None —</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink">Feature a Project (optional)</span>
          <select value={form.projectId} onChange={(e) => set("projectId", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">— None —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink">FAQ Items</span>
          <button type="button" onClick={() => setFaqItems((f) => [...f, { question: "", answer: "" }])} className="flex items-center gap-1 text-xs font-bold text-primary">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {faqItems.map((item, i) => (
            <div key={i} className="flex gap-2 rounded-lg border border-border p-2.5">
              <div className="flex-1 space-y-1.5">
                <input
                  value={item.question}
                  onChange={(e) => setFaqItems((f) => f.map((x, idx) => (idx === i ? { ...x, question: e.target.value } : x)))}
                  placeholder="Question"
                  className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs"
                />
                <textarea
                  value={item.answer}
                  onChange={(e) => setFaqItems((f) => f.map((x, idx) => (idx === i ? { ...x, answer: e.target.value } : x)))}
                  placeholder="Answer"
                  rows={2}
                  className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs"
                />
              </div>
              <button type="button" onClick={() => setFaqItems((f) => f.filter((_, idx) => idx !== i))} className="text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold text-ink">SEO Title</span>
          <input value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink">SEO Description</span>
          <input value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink">Campaign Source (for your own reference)</span>
          <input value={form.campaignSource} onChange={(e) => set("campaignSource", e.target.value)} placeholder="facebook" className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink">Campaign Name</span>
          <input value={form.campaignName} onChange={(e) => set("campaignName", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
        <span className="text-sm font-bold text-ink">Active (visible on the public site)</span>
      </label>

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button type="button" onClick={save} disabled={pending} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        {page && (
          <button type="button" onClick={remove} disabled={pending} className="rounded-full border-2 border-danger/30 px-5 py-2.5 text-sm font-bold text-danger">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
