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
} from "lucide-react";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { inquiriesRepository } from "@/lib/repositories/inquiries.repository";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";

// The in-memory repositories change on every admin action, so this page
// must never be served from a cached static snapshot.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [propertyStats, inquiryStats, recentProperties, recentInquiries] = await Promise.all([
    propertiesRepository.stats(),
    inquiriesRepository.stats(),
    propertiesRepository.list().then((l) => l.slice(0, 5)),
    inquiriesRepository.listRecent(5),
  ]);

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

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Properties" value={propertyStats.total} icon={Building2} />
        <StatCard label="Active Properties" value={propertyStats.available} icon={CheckCircle2} tone="success" />
        <StatCard label="Sold Properties" value={propertyStats.sold} icon={DollarSign} />
        <StatCard label="Featured Properties" value={propertyStats.featured} icon={Star} tone="primary" />
        <StatCard label="Total Inquiries" value={inquiryStats.total} icon={MessageSquare} />
        <StatCard label="New Leads" value={inquiryStats.new} icon={Sparkles} tone="primary" />
      </div>

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
            <h2 className="font-heading text-base font-bold text-ink">Recent Inquiries</h2>
            <Link href="/admin/inquiries" className="flex items-center gap-1 text-xs font-bold text-primary">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {recentInquiries.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">No inquiries yet.</p>
            )}
            {recentInquiries.map((i) => (
              <div key={i.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">{i.name}</span>
                  <StatusBadge status={i.status} />
                </div>
                <div className="mt-1 text-xs text-muted">
                  {i.propertyTitle ?? "General inquiry"} · {i.phone}
                </div>
                <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">{i.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
