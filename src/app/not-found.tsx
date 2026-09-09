import Link from "next/link";
import { Home, Building2, MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/site";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-20 text-center">
      <div className="font-heading text-7xl font-extrabold text-primary/20">404</div>
      <h1 className="mt-4 font-heading text-2xl font-extrabold text-ink sm:text-3xl">Page Not Found</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <Home className="h-4 w-4" /> Back to Home
        </Link>
        <Link
          href="/properties"
          className="flex items-center gap-2 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
        >
          <Building2 className="h-4 w-4" /> Browse Properties
        </Link>
        <a
          href={whatsappLink("Hi 5STAR.M, I couldn't find a page on your website and need some help.")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
        >
          <MessageCircle className="h-4 w-4" /> Contact 5STAR.M
        </a>
      </div>
    </main>
  );
}
