import Link from "next/link";
import { Eye, MessageCircle, Phone, Mail, CalendarClock, Newspaper, LayoutTemplate } from "lucide-react";
import { requireSection } from "@/lib/guard";
import { publicPortalAnalyticsService } from "@/services/publicPortalAnalyticsService";

export const dynamic = "force-dynamic";

function StatCard({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-2xl font-extrabold text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted">{label}</p>
    </div>
  );
}

/** Real numbers only — every figure here comes straight from
 *  property_views/website_events/leads/appointments/property_popularity
 *  (all pre-existing tables). Nothing here is estimated or fabricated. */
export default async function PublicPortalAnalyticsPage() {
  await requireSection("marketing");
  const data = await publicPortalAnalyticsService.summary(30);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Public Portal Analytics</h1>
      <p className="mt-1 text-sm text-muted">Real visitor activity over the last {data.sinceDays} days.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Eye} label="Property Views" value={data.propertyViews} />
        <StatCard icon={MessageCircle} label="WhatsApp Clicks" value={data.whatsappClicks} />
        <StatCard icon={Phone} label="Phone Clicks" value={data.phoneClicks} />
        <StatCard icon={Mail} label="Contact Form Submits" value={data.contactFormSubmits} />
        <StatCard icon={CalendarClock} label="Site Visit Requests" value={data.siteVisitRequests} />
        <StatCard icon={Newspaper} label="Published Blog Posts" value={data.blogPostsPublished} />
        <StatCard icon={LayoutTemplate} label="Active Landing Pages" value={data.activeLandingPages} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-heading text-sm font-bold text-ink">Top Viewed Properties</h2>
          <div className="mt-3 space-y-2">
            {data.topViewedProperties.map((p) => (
              <Link key={p.propertyId} href={`/properties/${p.slug}`} target="_blank" className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-surface-muted">
                <span className="text-ink">{p.title}</span>
                <span className="text-xs font-bold text-muted">
                  {p.views} views · {p.inquiries} inquiries
                </span>
              </Link>
            ))}
            {data.topViewedProperties.length === 0 && <p className="text-sm text-muted">No property views tracked yet.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-heading text-sm font-bold text-ink">Leads by Source</h2>
          <div className="mt-3 space-y-2">
            {data.leadsBySource.map((s) => (
              <div key={s.source} className="flex items-center justify-between text-sm">
                <span className="text-ink">{s.source}</span>
                <span className="font-bold text-primary">{s.count}</span>
              </div>
            ))}
            {data.leadsBySource.length === 0 && <p className="text-sm text-muted">No leads in this period.</p>}
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted">
        Detailed search/filter/map usage lives at{" "}
        <Link href="/admin/marketing/reports" className="font-bold text-primary hover:underline">
          Marketing Reports
        </Link>
        . Manage blog and landing page content at{" "}
        <Link href="/admin/content" className="font-bold text-primary hover:underline">
          Public Content
        </Link>
        .
      </p>
    </div>
  );
}
