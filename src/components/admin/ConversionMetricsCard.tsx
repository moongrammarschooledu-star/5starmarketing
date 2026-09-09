import type { ConversionMetrics } from "@/lib/models/analytics";

function pct(v: number | null) {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

export function ConversionMetricsCard({ metrics }: { metrics: ConversionMetrics }) {
  if (!metrics.hasEnoughData) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
        Not enough data yet. Conversion rates need at least 5 leads in the selected period.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric
          label="Lead Conversion Rate"
          value={pct(metrics.leadConversionRate)}
          caption="Closed leads ÷ all leads in this period."
        />
        <Metric
          label="Contact Rate"
          value={pct(metrics.contactRate)}
          caption="Leads that moved past 'New' ÷ all leads."
        />
        <Metric
          label="Closed Lead Rate"
          value={pct(metrics.closedLeadRate)}
          caption="Of leads that closed or were lost, the share that closed (win rate)."
        />
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Funnel</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <FunnelStep label="Inquiry → Contacted" value={pct(metrics.contactRate)} />
          <span className="text-muted-foreground">→</span>
          <FunnelStep label="Contacted → Interested" value={pct(metrics.interestRate)} />
          <span className="text-muted-foreground">→</span>
          <FunnelStep label="Interested → Closed" value={pct(metrics.leadConversionRate)} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1.5 font-heading text-2xl font-extrabold text-primary">{value}</div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">{caption}</p>
    </div>
  );
}

function FunnelStep({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1.5 font-semibold text-ink">
      {label} <span className="text-primary">{value}</span>
    </span>
  );
}
