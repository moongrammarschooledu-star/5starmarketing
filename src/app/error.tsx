"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled page error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h1 className="mt-4 font-heading text-2xl font-extrabold text-ink">Something Went Wrong</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        An unexpected error occurred while loading this page. Please try again, or head back home.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <RotateCw className="h-4 w-4" /> Try Again
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
        >
          <Home className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    </main>
  );
}
