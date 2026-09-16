import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { blogService } from "@/services/blogService";
import { blogCategories } from "@/lib/models/content";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  description: "Property tips, buying and selling guides, investment education and market insights from 5STAR.M Estate & Builders.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "Blog | 5STAR.M Estate & Builders", url: `${site.url}/blog` },
};

export default async function BlogIndexPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const posts = await blogService.listPublished(category, 30);

  return (
    <main className="mx-auto max-w-6xl px-4 py-14 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Insights</p>
      <h1 className="mt-2 font-heading text-3xl font-extrabold text-ink">5STAR.M Blog</h1>
      <p className="mt-2 text-sm text-muted">Property tips, guides and market education — written by our own team.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/blog" className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${!category ? "bg-primary text-primary-foreground" : "bg-surface-muted text-ink"}`}>
          All
        </Link>
        {blogCategories.map((c) => (
          <Link key={c} href={`/blog?category=${encodeURIComponent(c)}`} className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${category === c ? "bg-primary text-primary-foreground" : "bg-surface-muted text-ink"}`}>
            {c}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface hover:shadow-lg">
            {post.featuredImage && (
              <div className="relative aspect-[16/9] w-full">
                <Image src={post.featuredImage} alt={post.title} fill sizes="(min-width:1024px) 380px, 90vw" className="object-cover" />
              </div>
            )}
            <div className="flex flex-1 flex-col p-5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-primary">{post.category}</span>
              <h2 className="mt-1.5 font-heading text-base font-bold text-ink">{post.title}</h2>
              {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted">{post.excerpt}</p>}
              <p className="mt-3 text-xs text-muted-foreground">
                {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
              </p>
            </div>
          </Link>
        ))}
        {posts.length === 0 && <p className="col-span-full py-14 text-center text-sm text-muted">No blog posts published yet.</p>}
      </div>
    </main>
  );
}
