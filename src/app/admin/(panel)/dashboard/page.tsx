import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  CheckCircle2,
  DollarSign,
  Star,
  MessageSquare,
  Sparkles,
  PlusCircle,
  FolderPlus,
  ExternalLink,
  ArrowRight,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { leadService } from "@/services/leadService";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { FollowUpWhatsAppButton } from "@/components/admin/FollowUpWhatsAppButton";

// Data changes on every admin action, so this page must never be served
// from a cached static snapshot.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let propertyStats = { total: 0, available: 0, sold: 0, featured: 0 };
  let leadStats = { total: 0, new: 0, contacted: 0, interested: 0, followUp: 0, closed: 0, lost: 0 };
  let recentProperties: Awaited<ReturnType<typeof propertyService.list>> = [];
  let recentLeads: Awaited<ReturnType<typeof leadService.listRecent>> = [];
  let todaysFollowUps: Awaited<ReturnType<typeof leadService.todaysFollowUps>> = [];
  let loadError: string | null = null;

  try {
    const [pStats, lStats, properties, leads, followUps] = await Promise.all([
      propertyService.stats(),
      leadService.stats(),
      propertyService.list().then((l) => l.slice(0, 5)),
      leadService.listRecent(5),
      leadService.todaysFollowUps(),
    ]);
    propertyStats = pStats;
    leadStats = lStats;
    recentProperties = properties;
    recentLeads = leads;
    todaysFollowUps = followUps;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load dashboard data.";
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Overview of your properties and leads.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/admin/properties/new"
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
          >
            <PlusCircle className="h-4 w-4" /> Add Property
          </Link>
          <Link
            href="/admin/projects"
            className="flex items-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-xs font-bold text-ink hover:border-primary hover:text-primary"
          >
            <FolderPlus className="h-4 w-4" /> Add Project
          </Link>
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-xs font-bold text-ink hover:border-primary hover:text-primary"
          >
            <ExternalLink className="h-4 w-4" /> View Website
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Properties" value={propertyStats.total} icon={Building2} />
        <StatCard label="Active Properties" value={propertyStats.available} icon={CheckCircle2} tone="success" />
        <StatCard label="Sold Properties" value={propertyStats.sold} icon={DollarSign} />
        <StatCard label="Featured Properties" value={propertyStats.featured} icon={Star} tone="primary" />
        <StatCard label="Total Leads" value={leadStats.total} icon={MessageSquare} />
        <StatCard label="New Leads" value={leadStats.new} icon={Sparkles} tone="primary" />
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

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-ink">Recent Properties</h2>
            <Link href="/admin/properties" className="flex items-center gap-1 text-xs font-bold text-primary">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {recentProperties.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">No properties yet.</p>
            )}
            {recentProperties.map((p) => (
              <Link
                key={p.id}
                href={`/admin/properties/${p.id}/edit`}
                className="flex items-center gap-3 rounded-xl border border-border p-2.5 transition-colors hover:border-primary/30"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                  <Image src={p.images[0]} alt={p.title} fill sizes="56px" className="object-cover" unoptimized={p.images[0]?.startsWith("data:")} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-ink">{p.title}</div>
                  <div className="truncate text-xs text-muted">{p.location}</div>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-ink">Recent Leads</h2>
            <Link href="/admin/leads" className="flex items-center gap-1 text-xs font-bold text-primary">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {recentLeads.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">No leads yet.</p>
            )}
            {recentLeads.map((l) => (
              <Link
                key={l.id}
                href={`/admin/leads/${l.id}`}
                className="block rounded-xl border border-border p-3 transition-colors hover:border-primary/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">{l.name}</span>
                  <StatusBadge status={l.status} />
                </div>
                <div className="mt-1 text-xs text-muted">
                  {l.propertyTitle ?? "General inquiry"} · {l.phone}
                </div>
                <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">{l.message}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
