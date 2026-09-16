import Link from "next/link";
import { Newspaper, LayoutTemplate, MessageSquareQuote } from "lucide-react";
import { requireSection } from "@/lib/guard";
import { blogService } from "@/services/blogService";
import { landingPageService } from "@/services/landingPageService";
import { testimonialService } from "@/services/testimonialService";

export const dynamic = "force-dynamic";

export default async function ContentHubPage() {
  await requireSection("content");
  const [posts, pages, testimonials] = await Promise.all([
    blogService.listAll(),
    landingPageService.listAll(),
    testimonialService.listAll(),
  ]);
  const pendingTestimonials = testimonials.filter((t) => !t.approved).length;

  const cards = [
    { href: "/admin/content/blog", icon: Newspaper, label: "Blog", count: `${posts.length} posts` },
    { href: "/admin/content/landing-pages", icon: LayoutTemplate, label: "Landing Pages", count: `${pages.length} pages` },
    { href: "/admin/content/testimonials", icon: MessageSquareQuote, label: "Testimonials", count: `${pendingTestimonials} pending approval` },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Public Content</h1>
      <p className="mt-1 text-sm text-muted">Blog posts, campaign landing pages, and testimonials shown on the public site.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-2xl border border-border bg-surface p-5 hover:border-primary">
            <c.icon className="h-6 w-6 text-primary" />
            <p className="mt-3 font-heading text-sm font-bold text-ink">{c.label}</p>
            <p className="mt-1 text-xs text-muted">{c.count}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
