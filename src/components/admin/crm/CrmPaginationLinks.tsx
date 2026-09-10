"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function CrmPaginationLinks({ page, totalPages }: { page: number; totalPages: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p > 1) params.set("page", String(p));
    else params.delete("page");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-1.5">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-label="Previous page"
        aria-disabled={page <= 1}
        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink/15 text-ink ${page <= 1 ? "pointer-events-none opacity-30" : ""}`}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      {sorted.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && sorted[i - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Link
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
              p === page ? "bg-primary text-primary-foreground" : "border-2 border-ink/15 text-ink hover:border-primary"
            }`}
          >
            {p}
          </Link>
        </span>
      ))}
      <Link
        href={hrefFor(Math.min(totalPages, page + 1))}
        aria-label="Next page"
        aria-disabled={page >= totalPages}
        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink/15 text-ink ${page >= totalPages ? "pointer-events-none opacity-30" : ""}`}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}
