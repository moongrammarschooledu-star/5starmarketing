import { requireSection } from "@/lib/guard";
import { aiAuditService } from "@/services/aiAuditService";
import { aiActionRequestService } from "@/services/aiActionRequestService";
import { ApprovalQueue } from "./ApprovalQueue";

export const dynamic = "force-dynamic";

export default async function AiActivityPage() {
  await requireSection("ai");
  const [logs, pendingRequests] = await Promise.all([
    aiAuditService.listToolLogs({ limit: 100 }),
    aiActionRequestService.list({ status: "PENDING" }),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">AI Activity Log</h1>
      <p className="mt-1 text-sm text-muted">Every tool call the AI made, and every write action awaiting human approval.</p>

      <h2 className="mt-6 font-heading text-lg font-bold text-ink">Pending Approvals ({pendingRequests.length})</h2>
      <ApprovalQueue requests={pendingRequests} />

      <h2 className="mt-8 font-heading text-lg font-bold text-ink">Recent Tool Calls</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs font-bold uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Assistant</th>
              <th className="px-4 py-3">Tool</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Duration</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-muted">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-ink">{log.assistantType}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink">{log.toolName}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      log.status === "SUCCESS" ? "bg-green-100 text-green-700" : log.status === "DENIED" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{log.durationMs ? `${log.durationMs} ms` : "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                  No AI activity recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
