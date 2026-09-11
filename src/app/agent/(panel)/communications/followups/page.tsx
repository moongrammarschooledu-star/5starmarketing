import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { profileService } from "@/services/profileService";
import { followUpService } from "@/services/followUpService";
import { FollowUpRowActions } from "@/components/admin/FollowUpRowActions";
import { formatDateOnly } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function AgentFollowUpsPage() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
        <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> You need to be signed in to view your follow-ups.
      </div>
    );
  }

  let loadError: string | null = null;
  let overdue: Awaited<ReturnType<typeof followUpService.listByAgent>> = [];
  let dueToday: Awaited<ReturnType<typeof followUpService.listByAgent>> = [];
  let upcoming: Awaited<ReturnType<typeof followUpService.listByAgent>> = [];
  let completed: Awaited<ReturnType<typeof followUpService.listAll>> = [];

  try {
    await followUpService.markOverdue();
    [overdue, dueToday, upcoming, completed] = await Promise.all([
      followUpService.listByAgent(admin.id, "overdue"),
      followUpService.listByAgent(admin.id, "today"),
      followUpService.listByAgent(admin.id, "upcoming"),
      followUpService.listAll({ agentId: admin.id, status: "Completed" }),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load your follow-ups.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Follow-Up Inbox</h1>
      <p className="mt-1 text-sm text-muted">Every follow-up assigned to you, across leads and conversations.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FollowUpSection title="Overdue" followUps={overdue} tone="text-primary" />
        <FollowUpSection title="Due Today" followUps={dueToday} />
        <FollowUpSection title="Upcoming" followUps={upcoming} />
        <FollowUpSection title="Completed" followUps={completed.slice(0, 20)} tone="text-success" />
      </div>
    </div>
  );
}

function FollowUpSection({
  title,
  followUps,
  tone = "text-ink",
}: {
  title: string;
  followUps: Awaited<ReturnType<typeof followUpService.listByAgent>>;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className={`font-heading text-sm font-bold ${tone}`}>{title}</h2>
      <div className="mt-3 space-y-2.5">
        {followUps.length === 0 && <p className="text-xs text-muted">Nothing here.</p>}
        {followUps.map((f) => (
          <div key={f.id} className="rounded-xl border border-border bg-surface-muted/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Link href={`/agent/leads/${f.leadId}`} className="text-sm font-bold text-ink hover:text-primary">
                  {f.leadName || "Lead"}
                </Link>
                <div className="text-xs text-muted">
                  {formatDateOnly(f.followUpDate)} {f.followUpTime ?? ""} · {f.type}
                </div>
                {f.note && <p className="mt-1 text-xs text-muted">{f.note}</p>}
              </div>
              {f.status !== "Completed" && <FollowUpRowActions id={f.id} status={f.status} leadId={f.leadId} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
