import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSection } from "@/lib/guard";
import { blogService } from "@/services/blogService";

export const dynamic = "force-dynamic";

export default async function AdminBlogListPage() {
  await requireSection("content");
  const posts = await blogService.listAll();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-ink">Blog</h1>
        <Link href="/admin/content/blog/new" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> New Post
        </Link>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Published</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link href={`/admin/content/blog/${p.id}`} className="font-semibold text-ink hover:text-primary">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{p.category}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.status === "PUBLISHED" ? "bg-success/10 text-success" : "bg-surface-muted text-muted"}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("en-GB") : "—"}</td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted">
                  No blog posts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
