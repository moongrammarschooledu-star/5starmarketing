import type { MarketingFunnel } from "@/lib/models/campaign";

const STAGES: { key: keyof Omit<MarketingFunnel, "untracked">; label: string }[] = [
  { key: "visitors", label: "Visitors" },
  { key: "propertyViews", label: "Property Views" },
  { key: "inquiries", label: "Inquiries" },
  { key: "qualifiedLeads", label: "Qualified Leads" },
  { key: "siteVisits", label: "Site Visits" },
  { key: "negotiations", label: "Negotiations" },
  { key: "closedLeads", label: "Closed Leads" },
];

export function MarketingFunnelChart({ funnel }: { funnel: MarketingFunnel }) {
  const max = Math.max(1, ...STAGES.map((s) => funnel[s.key]));

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-heading text-sm font-bold text-ink">Conversion Funnel</h3>
      <div className="mt-4 space-y-2.5">
        {STAGES.map((stage) => {
          const value = funnel[stage.key];
          const isUntracked = funnel.untracked.includes(stage.key);
          const widthPercent = isUntracked ? 0 : Math.max(4, (value / max) * 100);
          return (
            <div key={stage.key}>
              <div className="flex items-center justify-between text-xs font-semibold text-muted">
                <span>{stage.label}</span>
                <span className="text-ink">{isUntracked ? "Tracking not available." : value.toLocaleString()}</span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-surface-muted">
                {!isUntracked && (
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${widthPercent}%` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
