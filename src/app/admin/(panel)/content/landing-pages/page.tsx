import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSection } from "@/lib/guard";
import { landingPageService } from "@/services/landingPageService";

export const dynamic = "force-dynamic";

export default async function AdminLandingPagesListPage() {
  await requireSection("content");
  const pages = await landingPageService.listAll();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-ink">Landing Pages</h1>
        <Link href="/admin/content/landing-pages/new" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> New Landing Page
        </Link>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link href={`/admin/content/landing-pages/${p.id}`} className="font-semibold text-ink hover:text-primary">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">/landing/{p.slug}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.active ? "bg-success/10 text-success" : "bg-surface-muted text-muted"}`}>
                    {p.active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted">
                  No landing pages yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
