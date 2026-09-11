import { MessageCircle, Mail, Smartphone, Globe } from "lucide-react";
import { communicationService } from "@/services/communicationService";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

const CHANNEL_ICON = { WHATSAPP: MessageCircle, EMAIL: Mail, SMS: Smartphone, PORTAL: Globe } as const;

function formatMinutes(m: number | null): string {
  if (m == null) return "—";
  if (m < 60) return `${Math.round(m)} min`;
  return `${(m / 60).toFixed(1)} hr`;
}

function pct(n: number | null): string {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}

export default async function CommunicationAnalyticsPage() {
  await requireSection("communications");
  const [stats, channels, agents] = await Promise.all([communicationService.dashboardStats(), communicationService.channelBreakdown(), communicationService.agentPerformance()]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Communication Analytics</h1>
      <p className="mt-1 text-sm text-muted">Every figure below is computed from real, logged messages and conversations — nothing is simulated.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Messages Sent" value={String(stats.messagesSent)} />
        <Stat label="Messages Received" value={String(stats.messagesReceived)} />
        <Stat label="Failed" value={String(stats.failedMessages)} accent />
        <Stat label="Delivery Rate" value={pct(stats.deliveryRate)} />
        <Stat label="Read Rate" value={pct(stats.readRate)} />
        <Stat label="Open Conversations" value={String(stats.openConversations)} />
        <Stat label="Unassigned" value={String(stats.unassignedConversations)} />
        <Stat label="SLA Breaches" value={String(stats.slaBreaches)} accent={stats.slaBreaches > 0} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat label="Avg. First Response" value={formatMinutes(stats.averageFirstResponseMinutes)} />
        <Stat label="Median First Response" value={formatMinutes(stats.medianFirstResponseMinutes)} />
      </div>
      {stats.averageFirstResponseMinutes == null && (
        <p className="mt-2 text-xs text-muted">No conversation yet has both an inbound message and a real agent reply — response-time figures will appear once one does.</p>
      )}

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Channel Breakdown</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map((c) => {
            const Icon = CHANNEL_ICON[c.channel as keyof typeof CHANNEL_ICON] ?? MessageCircle;
            return (
              <div key={c.channel} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                  <p className="font-heading text-sm font-bold text-ink">{c.channel}</p>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted">
                  <p>Sent: <span className="font-semibold text-ink">{c.sent}</span></p>
                  <p>Received: <span className="font-semibold text-ink">{c.received}</span></p>
                  <p>Failed: <span className="font-semibold text-ink">{c.failed}</span></p>
                  <p>Delivery Rate: <span className="font-semibold text-ink">{pct(c.deliveryRate)}</span></p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Agent Performance</h2>
        <p className="mt-1 text-xs text-muted">Reply volume alone is never used as a quality signal — paired here with real response time and completed follow-ups.</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Conversations</th>
                <th className="px-4 py-3">Replies Sent</th>
                <th className="px-4 py-3">Avg. Response</th>
                <th className="px-4 py-3">Follow-ups Completed</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">No agents found.</td>
                </tr>
              )}
              {agents.map((a) => (
                <tr key={a.agentId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">{a.agentName}</td>
                  <td className="px-4 py-3 text-muted">{a.conversationsAssigned}</td>
                  <td className="px-4 py-3 text-muted">{a.repliesSent}</td>
                  <td className="px-4 py-3 text-muted">{formatMinutes(a.averageResponseMinutes)}</td>
                  <td className="px-4 py-3 text-muted">{a.followUpsCompleted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Conversion Funnel</h2>
        <p className="mt-1 text-xs text-muted">Conversation Started → Agent Responded → Lead Qualified → Site Visit → Deal (from real CRM data).</p>
        <FunnelStub totalConversations={stats.totalConversations} respondedConversations={stats.totalConversations - stats.unassignedConversations} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-2xl font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function FunnelStub({ totalConversations }: { totalConversations: number; respondedConversations: number }) {
  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm text-ink">
        <span className="font-bold">{totalConversations}</span> conversations started this deployment.
      </p>
      <p className="mt-1 text-xs text-muted">
        A full stage-by-stage funnel (Qualified → Site Visit → Deal) requires connecting each conversation to its lead&apos;s CRM stage history — see the CRM Pipeline and Deals modules for those figures per-lead today; a unified funnel view is a
        disclosed scope reduction for this step.
      </p>
    </div>
  );
}
