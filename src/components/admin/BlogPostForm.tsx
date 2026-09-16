"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBlogPostAction, updateBlogPostAction, deleteBlogPostAction } from "@/lib/actions/content.actions";
import { blogCategories, type BlogPost, type BlogPostInput } from "@/lib/models/content";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function BlogPostForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    content: post?.content ?? "",
    featuredImage: post?.featuredImage ?? "",
    authorName: post?.authorName ?? "5STAR.M Estate & Builders",
    category: post?.category ?? blogCategories[0],
    tags: post?.tags.join(", ") ?? "",
    seoTitle: post?.seoTitle ?? "",
    seoDescription: post?.seoDescription ?? "",
    status: post?.status ?? "DRAFT",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    setError(null);
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required.");
      return;
    }
    const input: BlogPostInput = {
      title: form.title.trim(),
      slug: form.slug.trim() || slugify(form.title),
      excerpt: form.excerpt.trim() || undefined,
      content: form.content,
      featuredImage: form.featuredImage.trim() || undefined,
      authorName: form.authorName.trim() || "5STAR.M Estate & Builders",
      category: form.category as BlogPostInput["category"],
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      seoTitle: form.seoTitle.trim() || undefined,
      seoDescription: form.seoDescription.trim() || undefined,
      status: form.status as BlogPostInput["status"],
    };
    startTransition(async () => {
      try {
        if (post) {
          await updateBlogPostAction(post.id, input);
        } else {
          const created = await createBlogPostAction(input);
          router.push(`/admin/content/blog/${created.id}`);
          return;
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save this post.");
      }
    });
  }

  function remove() {
    if (!post) return;
    if (!confirm("Delete this blog post permanently?")) return;
    startTransition(async () => {
      await deleteBlogPostAction(post.id);
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
          <span className="text-xs font-bold text-ink">Slug (auto-generated if blank)</span>
          <input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder={slugify(form.title)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-bold text-ink">Excerpt</span>
        <textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
      </label>

      <label className="block">
        <span className="text-xs font-bold text-ink">Content</span>
        <textarea value={form.content} onChange={(e) => set("content", e.target.value)} rows={12} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono" />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold text-ink">Featured Image URL</span>
          <input value={form.featuredImage} onChange={(e) => set("featuredImage", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink">Author Name</span>
          <input value={form.authorName} onChange={(e) => set("authorName", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink">Category</span>
          <select value={form.category} onChange={(e) => set("category", e.target.value as typeof form.category)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            {blogCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink">Tags (comma-separated)</span>
          <input value={form.tags} onChange={(e) => set("tags", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold text-ink">SEO Title (optional override)</span>
          <input value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink">SEO Description (optional override)</span>
          <input value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.status === "PUBLISHED"} onChange={(e) => set("status", e.target.checked ? "PUBLISHED" : "DRAFT")} />
        <span className="text-sm font-bold text-ink">Published (visible on the public site)</span>
      </label>

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button type="button" onClick={save} disabled={pending} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        {post && (
          <button type="button" onClick={remove} disabled={pending} className="rounded-full border-2 border-danger/30 px-5 py-2.5 text-sm font-bold text-danger">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
