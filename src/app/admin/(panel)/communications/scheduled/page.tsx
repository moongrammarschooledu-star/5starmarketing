import Link from "next/link";
import { Clock } from "lucide-react";
import { communicationService } from "@/services/communicationService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CancelScheduleButton } from "@/components/admin/communications/CancelScheduleButton";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function ScheduledMessagesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireSection("communications");
  const sp = await searchParams;
  await communicationService.processScheduledQueue().catch(() => {});
  const schedules = await communicationService.listSchedules(sp.status);

  const statuses = ["SCHEDULED", "PROCESSING", "SENT", "FAILED", "CANCELLED"];

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Scheduled Messages</h1>
      <p className="mt-1 text-sm text-muted">One-time scheduled sends, processed opportunistically when this page (or the dashboard) loads.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/communications/scheduled" className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${!sp.status ? "bg-primary text-primary-foreground" : "border-2 border-ink/15 text-ink hover:border-primary"}`}>
          All
        </Link>
        {statuses.map((s) => (
          <Link key={s} href={`/admin/communications/scheduled?status=${s}`} className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${sp.status === s ? "bg-primary text-primary-foreground" : "border-2 border-ink/15 text-ink hover:border-primary"}`}>
            {s}
          </Link>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Scheduled For</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  <Clock className="mx-auto mb-2 h-6 w-6 text-muted" /> No scheduled messages.
                </td>
              </tr>
            )}
            {schedules.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">
                  <Link href={`/admin/communications/conversations/${s.conversationId}`} className="hover:text-primary hover:underline">
                    {s.counterpartName || "Unknown"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{s.channel}</td>
                <td className="max-w-xs truncate px-4 py-3 text-muted">{s.bodyPreview}</td>
                <td className="px-4 py-3 text-muted">{new Date(s.scheduledFor).toLocaleString("en-GB")}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={s.status} />
                  {s.failureReason && <p className="mt-1 max-w-xs text-xs text-primary">{s.failureReason}</p>}
                </td>
                <td className="px-4 py-3">{s.status === "SCHEDULED" && <CancelScheduleButton messageId={s.messageId} conversationId={s.conversationId} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
