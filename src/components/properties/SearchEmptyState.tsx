import { SearchX, AlertTriangle } from "lucide-react";

export function SearchEmptyState({ onClearAll, onBrowseAll }: { onClearAll: () => void; onBrowseAll: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface-muted/50 px-6 py-16 text-center">
      <SearchX className="h-10 w-10 text-muted-foreground" />
      <h3 className="font-heading text-lg font-bold text-ink">No properties found</h3>
      <p className="max-w-sm text-sm text-muted">
        Try increasing your price range, choosing a nearby area, or removing a filter or two.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        <button type="button" onClick={onClearAll} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
          Clear All Filters
        </button>
        <button type="button" onClick={onBrowseAll} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
          Browse All Properties
        </button>
      </div>
    </div>
  );
}

export function SearchErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-16 text-center">
      <AlertTriangle className="h-10 w-10 text-primary" />
      <h3 className="font-heading text-lg font-bold text-ink">Unable to load properties right now.</h3>
      <p className="max-w-sm text-sm text-muted">Please check your connection and try again.</p>
      <button type="button" onClick={onRetry} className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
        Retry
      </button>
    </div>
  );
}
