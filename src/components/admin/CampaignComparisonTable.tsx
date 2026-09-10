"use client";

import { useEffect, useState } from "react";
import type { Campaign, CampaignPerformance, CampaignCostAnalytics } from "@/lib/models/campaign";
import { compareCampaignsAction } from "@/lib/actions/marketing.actions";

function formatPercent(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

function formatCost(v: number | null): string {
  return v === null ? "Not available" : `Rs. ${v.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

export function CampaignComparisonTable({ campaigns }: { campaigns: Campaign[] }) {
  const [rows, setRows] = useState<Record<string, { performance: CampaignPerformance; cost: CampaignCostAnalytics }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    compareCampaignsAction(campaigns.map((c) => c.id)).then((results) => {
      if (cancelled) return;
      const map: typeof rows = {};
      for (const r of results) map[r.id] = { performance: r.performance, cost: r.cost };
      setRows(map);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns.map((c) => c.id).join(",")]);

  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
      <h3 className="font-heading text-sm font-bold text-ink">Comparing {campaigns.length} Campaigns</h3>
      {loading ? (
        <p className="mt-3 text-sm text-muted">Loading comparison...</p>
      ) : (
        <table className="mt-3 w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">Campaign</th>
              <th className="py-2 pr-3">Leads</th>
              <th className="py-2 pr-3">Qualified</th>
              <th className="py-2 pr-3">Site Visits</th>
              <th className="py-2 pr-3">Closed</th>
              <th className="py-2 pr-3">Conversion</th>
              <th className="py-2">Cost / Lead</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const r = rows[c.id];
              return (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 font-semibold text-ink">{c.name}</td>
                  <td className="py-2 pr-3 text-muted">{r?.performance.leads ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted">{r?.performance.qualifiedLeads ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted">{r?.performance.siteVisits ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted">{r?.performance.closedLeads ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted">{r ? formatPercent(r.performance.leadConversionRate) : "—"}</td>
                  <td className="py-2 text-muted">{r ? formatCost(r.cost.costPerLead) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
