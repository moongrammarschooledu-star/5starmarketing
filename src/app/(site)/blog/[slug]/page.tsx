import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { blogService } from "@/services/blogService";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await blogService.getBySlug(slug);
  if (!post || post.status !== "PUBLISHED") return { title: "Post Not Found" };
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: `${title} | 5STAR.M Estate & Builders`,
      description,
      url: `${site.url}/blog/${post.slug}`,
      images: post.featuredImage ? [{ url: post.featuredImage }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await blogService.getBySlug(slug);
  if (!post || post.status !== "PUBLISHED") notFound();

  const related = await blogService.listRelated(post.category, post.id, 3);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    image: post.featuredImage ? [post.featuredImage] : undefined,
    author: { "@type": "Organization", name: post.authorName },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 lg:px-8 lg:py-14">
      <JsonLd data={articleJsonLd} />
      <Breadcrumbs items={[{ label: "Blog", href: "/blog" }, { label: post.title }]} />

      <Link href="/blog" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Blog
      </Link>

      <span className="mt-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">{post.category}</span>
      <h1 className="mt-3 font-heading text-3xl font-extrabold text-ink">{post.title}</h1>
      <p className="mt-2 text-xs text-muted">
        By {post.authorName} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""}
      </p>

      {post.featuredImage && (
        <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-2xl">
          <Image src={post.featuredImage} alt={post.title} fill sizes="768px" className="object-cover" />
        </div>
      )}

      <div className="prose prose-sm mt-8 max-w-none whitespace-pre-wrap text-sm leading-relaxed text-ink">{post.content}</div>

      {post.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-6">
          {post.tags.map((t) => (
            <span key={t} className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted">
              #{t}
            </span>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="font-heading text-lg font-bold text-ink">More in {post.category}</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.id} href={`/blog/${r.slug}`} className="rounded-xl border border-border bg-surface p-4 hover:border-primary">
                <p className="text-sm font-bold text-ink">{r.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
