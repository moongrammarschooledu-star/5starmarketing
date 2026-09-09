function BarList({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">No data yet.</p>;
  }
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-xs font-semibold text-ink" title={d.label}>
            {d.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(4, (d.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs font-bold text-muted-foreground">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

export function LeadCharts({
  bySource,
  byStatus,
  topProperties,
}: {
  bySource: { label: string; count: number }[];
  byStatus: { label: string; count: number }[];
  topProperties: { label: string; count: number }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-heading text-sm font-bold text-ink">Leads by Source</h3>
        <div className="mt-4">
          <BarList data={bySource} />
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-heading text-sm font-bold text-ink">Leads by Status</h3>
        <div className="mt-4">
          <BarList data={byStatus} />
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-heading text-sm font-bold text-ink">Most Inquired Properties</h3>
        <div className="mt-4">
          <BarList data={topProperties} />
        </div>
      </div>
    </div>
  );
}
