import { ChevronLeft, ChevronRight } from "lucide-react";

export function PropertyPagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink/15 text-ink disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {sorted.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && sorted[i - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
          <button
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
              p === page ? "bg-primary text-primary-foreground" : "border-2 border-ink/15 text-ink hover:border-primary"
            }`}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink/15 text-ink disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
