export function PropertyCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="aspect-[4/3] w-full animate-pulse bg-surface-muted" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-surface-muted" />
      </div>
    </div>
  );
}

export function PropertyResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-live="polite" aria-label="Loading properties">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}
