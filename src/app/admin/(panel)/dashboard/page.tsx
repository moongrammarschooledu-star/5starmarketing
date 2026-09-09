import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  DollarSign,
  FolderKanban,
  Rocket,
  Users,
  Sparkles,
  CalendarClock,
  PlusCircle,
  FolderPlus,
  ExternalLink,
  ArrowRight,
  AlertTriangle,
  ClipboardList,
  Settings,
  BarChart3,
} from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { leadService } from "@/services/leadService";
import { analyticsService, resolveDateRange } from "@/services/analyticsService";
import { activityService } from "@/services/activityService";
import { appointmentService } from "@/services/appointmentService";
import type { DateRangeKey, AttentionItem } from "@/lib/models/analytics";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { FollowUpWhatsAppButton } from "@/components/admin/FollowUpWhatsAppButton";
import { AnalyticsTimeFilter } from "@/components/admin/AnalyticsTimeFilter";
import { AttentionCenter } from "@/components/admin/AttentionCenter";
import { RecentActivityFeed } from "@/components/admin/RecentActivityFeed";
import { CountBucketChart } from "@/components/admin/charts/CountBucketChart";
import { TrendChart } from "@/components/admin/charts/TrendChart";
import { ConversionMetricsCard } from "@/components/admin/ConversionMetricsCard";
import { PropertyPerformanceTable } from "@/components/admin/PropertyPerformanceTable";

// Data changes on every admin action, so this page must never be served
// from a cached static snapshot.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const rangeKey = (sp.range as DateRangeKey) || "30d";
  const range = resolveDateRange(rangeKey, { from: sp.from, to: sp.to });

  let loadError: string | null = null;
  let overview = {
    totalProperties: 0, availableProperties: 0, reservedProperties: 0, soldProperties: 0,
    totalProjects: 0, activeProjects: 0, totalLeads: 0, newLeads: 0, followUpsDue: 0, closedLeads: 0,
  };
  let propertyAnalytics: Awaited<ReturnType<typeof analyticsService.propertyAnalytics>> = {
    total: 0, available: 0, reserved: 0, sold: 0, featured: 0, byType: [], byStatus: [], byLocation: [], byPaymentOption: [],
  };
  let leadAnalytics: Awaited<ReturnType<typeof leadService.analyticsInRange>> = {
    total: 0, new: 0, contacted: 0, interested: 0, followUp: 0, closed: 0, lost: 0,
    bySource: [], byStatus: [], overTime: [], topProperties: [],
  };
  let conversion: Awaited<ReturnType<typeof analyticsService.conversionMetrics>> = {
    hasEnoughData: false, totalLeads: 0, contactRate: null, interestRate: null, leadConversionRate: null, closedLeadRate: null,
  };
  let performance: Awaited<ReturnType<typeof analyticsService.propertyPerformance>> = [];
  let recentActivity: Awaited<ReturnType<typeof activityService.recentFeed>> = [];
  let todaysFollowUps: Awaited<ReturnType<typeof leadService.todaysFollowUps>> = [];
  let dataQuality: Awaited<ReturnType<typeof propertyService.dataQualityIssues>> = [];
  let missingCoverProjects: Awaited<ReturnType<typeof projectService.missingCoverImage>> = [];
  let todaysAppointments: Awaited<ReturnType<typeof appointmentService.todaysAppointments>> = [];
  let upcomingAppointments: Awaited<ReturnType<typeof appointmentService.upcomingAppointments>> = [];

  try {
    [
      overview,
      propertyAnalytics,
      leadAnalytics,
      conversion,
      performance,
      recentActivity,
      todaysFollowUps,
      dataQuality,
      missingCoverProjects,
      todaysAppointments,
      upcomingAppointments,
    ] = await Promise.all([
      analyticsService.overview(),
      analyticsService.propertyAnalytics(),
      leadService.analyticsInRange(range),
      analyticsService.conversionMetrics(range),
      analyticsService.propertyPerformance(range),
      activityService.recentFeed(8),
      leadService.todaysFollowUps(),
      propertyService.dataQualityIssues(),
      projectService.missingCoverImage(),
      appointmentService.todaysAppointments(),
      appointmentService.upcomingAppointments(6),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load dashboard data.";
  }

  const missingImages = dataQuality.filter((d) => d.missing.includes("Image")).length;
  const missingDescriptions = dataQuality.filter((d) => d.missing.includes("Description")).length;

  const attentionItems: AttentionItem[] = [
    { label: "New Leads", count: overview.newLeads, href: "/admin/leads" },
    { label: "Follow-Ups Due Today", count: todaysFollowUps.length, href: "/admin/leads" },
    { label: "Overdue Follow-Ups", count: Math.max(overview.followUpsDue - todaysFollowUps.length, 0), href: "/admin/leads" },
    { label: "Properties Without Images", count: missingImages, href: "/admin/properties" },
    { label: "Properties Without Descriptions", count: missingDescriptions, href: "/admin/properties" },
    { label: "Projects Missing Cover Images", count: missingCoverProjects.length, href: "/admin/projects" },
  ];

  const lastUpdated = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Complete business overview — properties, projects and leads.</p>
        </div>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <QuickAction href="/admin/properties/new" icon={PlusCircle} label="Add Property" primary />
        <QuickAction href="/admin/projects/new" icon={FolderPlus} label="Add Project" />
        <QuickAction href="/admin/leads" icon={Users} label="View Leads" />
        <QuickAction href="/admin/reports" icon={ClipboardList} label="View Reports" />
        <QuickAction href="/admin/settings" icon={Settings} label="Website Settings" />
        <QuickAction href="/" icon={ExternalLink} label="View Website" external />
      </div>

      {/* Section 1 — Super Admin overview (current state, all-time) */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Properties" value={overview.totalProperties} icon={Building2} />
        <StatCard label="Available" value={overview.availableProperties} icon={CheckCircle2} tone="success" />
        <StatCard label="Reserved" value={overview.reservedProperties} icon={DollarSign} tone="primary" />
        <StatCard label="Sold" value={overview.soldProperties} icon={DollarSign} />
        <StatCard label="Total Projects" value={overview.totalProjects} icon={FolderKanban} />
        <StatCard label="Active Projects" value={overview.activeProjects} icon={Rocket} tone="primary" />
        <StatCard label="Total Leads" value={overview.totalLeads} icon={Users} />
        <StatCard label="New Leads" value={overview.newLeads} icon={Sparkles} tone="primary" />
        <StatCard label="Follow-Ups Due" value={overview.followUpsDue} icon={CalendarClock} tone="success" />
        <StatCard label="Closed Leads" value={overview.closedLeads} icon={CheckCircle2} tone="success" />
      </div>

      {todaysFollowUps.length > 0 && (
        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
            <CalendarClock className="h-4.5 w-4.5 text-primary" /> Today&apos;s Follow-Ups ({todaysFollowUps.length})
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {todaysFollowUps.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-surface py-1.5 pl-3.5 pr-1.5 text-xs font-bold text-ink"
              >
                <Link href={`/admin/leads/${l.id}`} className="flex items-center gap-2 hover:text-primary">
                  {l.name}
                  {l.nextFollowUpTime && <span className="text-primary">{l.nextFollowUpTime.slice(0, 5)}</span>}
                </Link>
                <FollowUpWhatsAppButton
                  leadId={l.id}
                  name={l.name}
                  phone={l.phone}
                  whatsapp={l.whatsapp}
                  propertyTitle={l.propertyTitle}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Site Visits */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
            <CalendarClock className="h-4.5 w-4.5 text-primary" /> Today&apos;s Site Visits ({todaysAppointments.length})
          </h3>
          <Link href="/admin/appointments" className="flex items-center gap-1 text-xs font-bold text-primary">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {todaysAppointments.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No site visits scheduled for today.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {todaysAppointments.map((a) => (
              <Link
                key={a.id}
                href={`/admin/appointments/${a.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 hover:border-primary/30"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="font-bold text-primary">{a.appointmentTime}</span>
                  <span className="truncate text-sm text-ink">{a.name} — {a.propertyTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{a.assignedAgent || "Unassigned"}</span>
                  <StatusBadge status={a.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Site Visits */}
      <div className="mt-8">
        <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
          <CalendarClock className="h-4.5 w-4.5 text-primary" /> Upcoming Site Visits
        </h3>
        {upcomingAppointments.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No upcoming site visits.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {upcomingAppointments.map((a) => (
              <Link
                key={a.id}
                href={`/admin/appointments/${a.id}`}
                className="flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-3.5 pr-3 text-xs font-bold text-ink hover:border-primary/30"
              >
                {a.appointmentDate} {a.appointmentTime} · {a.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Alerts & Attention Center */}
      <div className="mt-8">
        <AttentionCenter items={attentionItems} />
      </div>

      {/* Time filter — governs everything below */}
      <div className="mt-8 flex items-center gap-2 border-t border-border pt-6">
        <BarChart3 className="h-4.5 w-4.5 text-primary" />
        <h2 className="font-heading text-base font-bold text-ink">Analytics</h2>
      </div>
      <div className="mt-3">
        <AnalyticsTimeFilter current={rangeKey} lastUpdated={lastUpdated} />
      </div>

      {/* Section 2 — Property Analytics (current inventory composition, not
          time-filtered — see the STEP 9 report for why). */}
      <div className="mt-6">
        <h3 className="font-heading text-sm font-bold text-ink">Property Analytics</h3>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <StatCard label="Total" value={propertyAnalytics.total} icon={Building2} />
          <StatCard label="Available" value={propertyAnalytics.available} icon={CheckCircle2} tone="success" />
          <StatCard label="Reserved" value={propertyAnalytics.reserved} icon={DollarSign} tone="primary" />
          <StatCard label="Sold" value={propertyAnalytics.sold} icon={DollarSign} />
          <StatCard label="Featured" value={propertyAnalytics.featured} icon={Sparkles} tone="primary" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CountBucketChart title="Properties by Type" data={propertyAnalytics.byType} />
          <CountBucketChart title="Properties by Status" data={propertyAnalytics.byStatus} />
          <CountBucketChart title="Properties by Location" data={propertyAnalytics.byLocation} />
          <CountBucketChart title="Properties by Payment Option" data={propertyAnalytics.byPaymentOption} />
        </div>
      </div>

      {/* Section 3 — Lead Analytics (scoped to the selected time range) */}
      <div className="mt-10">
        <h3 className="font-heading text-sm font-bold text-ink">Lead Analytics ({range.label})</h3>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          <StatCard label="Total" value={leadAnalytics.total} icon={Users} />
          <StatCard label="New" value={leadAnalytics.new} icon={Sparkles} tone="primary" />
          <StatCard label="Contacted" value={leadAnalytics.contacted} icon={Users} />
          <StatCard label="Interested" value={leadAnalytics.interested} icon={CheckCircle2} tone="success" />
          <StatCard label="Follow-Up" value={leadAnalytics.followUp} icon={CalendarClock} />
          <StatCard label="Closed" value={leadAnalytics.closed} icon={CheckCircle2} tone="success" />
          <StatCard label="Lost" value={leadAnalytics.lost} icon={AlertTriangle} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CountBucketChart title="Leads by Status" data={leadAnalytics.byStatus} />
          <CountBucketChart title="Leads by Source" data={leadAnalytics.bySource} />
          <TrendChart title="Leads over Time" data={leadAnalytics.overTime} />
          <CountBucketChart title="Most Inquired Properties" data={leadAnalytics.topProperties} />
        </div>
      </div>

      {/* Section 4 — Conversion Analytics */}
      <div className="mt-10">
        <h3 className="font-heading text-sm font-bold text-ink">Conversion Analytics ({range.label})</h3>
        <div className="mt-3">
          <ConversionMetricsCard metrics={conversion} />
        </div>
      </div>

      {/* Section 6 — Property Performance */}
      <div className="mt-10">
        <h3 className="font-heading text-sm font-bold text-ink">Top Performing Properties ({range.label})</h3>
        <div className="mt-3">
          <PropertyPerformanceTable rows={performance} />
        </div>
      </div>

      {/* Section 13 — Recent Activity */}
      <div className="mt-10 grid grid-cols-1 gap-6 border-t border-border pt-8 xl:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-bold text-ink">Recent Activity</h3>
            <Link href="/admin/activity" className="flex items-center gap-1 text-xs font-bold text-primary">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3">
            <RecentActivityFeed entries={recentActivity} />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  primary,
  external,
}: {
  href: string;
  icon: typeof PlusCircle;
  label: string;
  primary?: boolean;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className={
        primary
          ? "flex flex-col items-center gap-2 rounded-2xl bg-primary p-4 text-center text-xs font-bold text-primary-foreground hover:bg-primary-hover"
          : "flex flex-col items-center gap-2 rounded-2xl border-2 border-ink/10 p-4 text-center text-xs font-bold text-ink hover:border-primary hover:text-primary"
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
