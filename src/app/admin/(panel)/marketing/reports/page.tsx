import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

const REPORTS: { title: string; description: string; href: string }[] = [
  { title: "Lead Source Report", description: "Visitors, leads, qualified leads, site visits and closed leads by first-touch source.", href: "/admin/marketing/sources" },
  { title: "Campaign Performance Report", description: "Leads, conversion, cost per lead/qualified/closed and budget status per campaign.", href: "/admin/reports/marketing" },
  { title: "UTM Performance Report", description: "Exact source/medium/campaign combinations and their lead/conversion counts.", href: "/admin/reports/marketing" },
  { title: "Platform Performance Report", description: "Campaigns and leads grouped by advertising platform.", href: "/admin/reports/marketing" },
  { title: "Cost Analysis Report", description: "Spend, budget remaining and over-budget campaigns.", href: "/admin/reports/marketing" },
  { title: "Conversion Funnel Report", description: "Visitors → property views → inquiries → qualified → site visits → negotiations → closed.", href: "/admin/reports/marketing" },
  { title: "Agent Report", description: "Assigned/contacted/qualified/site-visits/converted/lost and follow-ups completed, per agent.", href: "/admin/crm/analytics" },
  { title: "Property & Project Report", description: "Leads, site visits and conversions per property and per project.", href: "/admin/crm/analytics" },
  { title: "Lead Score & Response Time Report", description: "SLA breaches and average response/conversion time.", href: "/admin/marketing/analytics" },
  { title: "Re-Engagement Report", description: "Leads with no activity in 14+ days, ready for manual follow-up.", href: "/admin/marketing/analytics" },
];

export default async function MarketingReportsPage() {
  await requireSection("marketing");

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">Marketing Reports</h1>
        <p className="mt-1 text-sm text-muted">Every report below is computed live from real Supabase data, with CSV export where noted.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Link key={r.title} href={r.href} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface p-5 hover:border-primary">
            <div>
              <p className="font-heading text-base font-bold text-ink">{r.title}</p>
              <p className="mt-1 text-sm text-muted">{r.description}</p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
          </Link>
        ))}
      </div>
    </div>
  );
}
