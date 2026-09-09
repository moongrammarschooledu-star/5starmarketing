import Link from "next/link";
import {
  MessageCircle,
  Users,
  Sparkles,
  PhoneCall,
  CalendarClock,
  Settings2,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { leadService } from "@/services/leadService";
import { whatsappService } from "@/services/whatsappService";
import { settingsService } from "@/services/settingsService";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { LeadCharts } from "@/components/admin/LeadCharts";
import { whatsappUrlFor } from "@/lib/site";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppPage() {
  await requireSection("whatsapp");
  let settings: Awaited<ReturnType<typeof settingsService.get>> | null = null;
  let allLeads: Awaited<ReturnType<typeof leadService.list>> = [];
  let totalActions = 0;
  let insights: Awaited<ReturnType<typeof leadService.insights>> = {
    bySource: [],
    byStatus: [],
    topProperties: [],
  };
  let loadError: string | null = null;

  try {
    const [s, leads, actions, i] = await Promise.all([
      settingsService.get(),
      leadService.list(),
      whatsappService.totalActionsCount(),
      leadService.insights(),
    ]);
    settings = s;
    allLeads = leads;
    totalActions = actions;
    insights = i;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load WhatsApp data.";
  }

  const waLeads = allLeads.filter((l) => l.source === "WhatsApp");
  const stats = {
    total: waLeads.length,
    new: waLeads.filter((l) => l.status === "New").length,
    contacted: waLeads.filter((l) => l.status === "Contacted").length,
    followUp: waLeads.filter((l) => l.status === "Follow-Up").length,
  };
  const followUpRequired = allLeads.filter((l) => l.nextFollowUpDate).length;
  const recentWaLeads = waLeads.slice(0, 5);

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">WhatsApp Communication Center</h1>
          <p className="mt-1 text-sm text-muted">
            Every WhatsApp-sourced lead and action, in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/admin/whatsapp/templates"
            className="flex items-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-xs font-bold text-ink hover:border-primary hover:text-primary"
          >
            <Settings2 className="h-4 w-4" /> Manage Templates
          </Link>
          {settings && (
            <a
              href={whatsappUrlFor(settings.whatsapp, settings.whatsappDefaultGreeting)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-success px-4 py-2.5 text-xs font-bold text-white"
            >
              <MessageCircle className="h-4 w-4" /> Open WhatsApp
            </a>
          )}
        </div>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      {settings && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            WhatsApp Business Number
          </div>
          <div className="mt-1 text-lg font-extrabold text-ink">{settings.whatsapp}</div>
          <div className="text-sm text-muted">{settings.whatsappDisplayName}</div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total WhatsApp Leads" value={stats.total} icon={Users} />
        <StatCard label="New WhatsApp Leads" value={stats.new} icon={Sparkles} tone="primary" />
        <StatCard label="Contacted" value={stats.contacted} icon={PhoneCall} />
        <StatCard label="Follow-Up" value={stats.followUp} icon={CalendarClock} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-ink">Recent WhatsApp Leads</h2>
            <Link href="/admin/leads" className="text-xs font-bold text-primary">
              View all leads →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentWaLeads.length === 0 && <p className="py-6 text-center text-sm text-muted">No WhatsApp leads yet.</p>}
            {recentWaLeads.map((l) => (
              <Link
                key={l.id}
                href={`/admin/leads/${l.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/30"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-ink">{l.name}</div>
                  <div className="truncate text-xs text-muted">{l.propertyTitle ?? "General inquiry"}</div>
                </div>
                <StatusBadge status={l.status} />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
            <Activity className="h-4.5 w-4.5 text-primary" /> WhatsApp Analytics
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">WhatsApp Actions Logged</div>
              <div className="mt-1 font-heading text-2xl font-extrabold text-ink">{totalActions}</div>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Leads Needing Follow-Up</div>
              <div className="mt-1 font-heading text-2xl font-extrabold text-ink">{followUpRequired}</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            These are real counts from your own team&apos;s actions — normal WhatsApp click-to-chat
            links cannot report message delivery or read status.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <LeadCharts {...insights} />
      </div>
    </div>
  );
}
