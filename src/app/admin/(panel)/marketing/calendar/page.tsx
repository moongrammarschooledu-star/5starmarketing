import Link from "next/link";
import { AlertTriangle, CalendarClock } from "lucide-react";
import clsx from "clsx";
import { campaignService } from "@/services/campaignService";
import { requireSection } from "@/lib/guard";
import { formatDateOnly } from "@/lib/date";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  Draft: "bg-muted/20 text-muted",
  Active: "bg-success/10 text-success",
  Paused: "bg-amber-500/10 text-amber-600",
  Completed: "bg-primary/10 text-primary",
  Archived: "bg-ink/10 text-ink",
};

export default async function AdminMarketingCalendarPage() {
  await requireSection("marketing");

  let campaigns: Awaited<ReturnType<typeof campaignService.listForCalendar>> = [];
  let loadError: string | null = null;
  try {
    campaigns = await campaignService.listForCalendar();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the marketing calendar.";
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = campaigns.filter((c) => c.startDate && c.startDate > today);
  const active = campaigns.filter((c) => (!c.startDate || c.startDate <= today) && (!c.endDate || c.endDate >= today) && c.status === "Active");
  const completed = campaigns.filter((c) => c.status === "Completed" || (c.endDate && c.endDate < today));

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Marketing Calendar</h1>
      <p className="mt-1 text-sm text-muted">Every campaign&apos;s real start/end date and status, at a glance.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CalendarColumn title="Active Now" campaigns={active} empty="No campaigns currently active." />
        <CalendarColumn title="Upcoming" campaigns={upcoming} empty="No upcoming campaigns scheduled." />
        <CalendarColumn title="Completed" campaigns={completed} empty="No completed campaigns yet." />
      </div>
    </div>
  );
}

function CalendarColumn({
  title,
  campaigns,
  empty,
}: {
  title: string;
  campaigns: Awaited<ReturnType<typeof campaignService.listForCalendar>>;
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
        <CalendarClock className="h-4.5 w-4.5 text-primary" /> {title}
      </h2>
      <div className="mt-3 space-y-2.5">
        {campaigns.length === 0 && <p className="text-xs text-muted">{empty}</p>}
        {campaigns.map((c) => (
          <Link key={c.id} href={`/admin/marketing/campaigns/${c.id}`} className="block rounded-xl border border-border bg-surface-muted/50 p-3 hover:border-primary">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-ink">{c.name}</span>
              <span className={clsx("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", STATUS_TONE[c.status])}>{c.status}</span>
            </div>
            <div className="mt-1 text-xs text-muted">
              {c.startDate ? formatDateOnly(c.startDate) : "No start date"} – {c.endDate ? formatDateOnly(c.endDate) : "No end date"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
