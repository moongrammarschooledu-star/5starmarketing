export default function PropertiesLoading() {
  return (
    <main className="bg-surface-muted">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-surface" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded-lg bg-surface" />
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="aspect-[4/3] w-full animate-pulse bg-surface-muted" />
              <div className="space-y-2.5 p-5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
