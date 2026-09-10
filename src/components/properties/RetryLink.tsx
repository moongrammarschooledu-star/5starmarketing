"use client";

import { useRouter } from "next/navigation";

/** Minimal client "Retry" control for a Server Component's own catch
 *  block (page.tsx's top-level load failure) — router.refresh() re-runs
 *  the Server Component with the same URL/searchParams rather than a
 *  full page reload. */
export function RetryLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
    >
      Retry
    </button>
  );
}
