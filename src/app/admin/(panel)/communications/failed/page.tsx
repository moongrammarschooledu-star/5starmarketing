import Link from "next/link";
import { AlertOctagon } from "lucide-react";
import { communicationService } from "@/services/communicationService";
import { RetryMessageButton } from "@/components/admin/communications/RetryMessageButton";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function FailedMessagesPage() {
  await requireSection("communications");
  const failed = await communicationService.listFailedMessages();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Failed Message Center</h1>
      <p className="mt-1 text-sm text-muted">Every message that could not be delivered — retry once the underlying issue (provider, recipient, template) is fixed.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Retries</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {failed.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  <AlertOctagon className="mx-auto mb-2 h-6 w-6 text-muted" /> No failed messages.
                </td>
              </tr>
            )}
            {failed.map((f) => (
              <tr key={f.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">
                  <Link href={`/admin/communications/conversations/${f.conversationId}`} className="hover:text-primary hover:underline">
                    {f.counterpartName || "Unknown"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{f.channel}</td>
                <td className="px-4 py-3 text-muted">{f.provider || "—"}</td>
                <td className="max-w-xs px-4 py-3 text-xs text-primary">{f.failureReason || "Unknown error"}</td>
                <td className="px-4 py-3 text-muted">{f.retryCount}</td>
                <td className="px-4 py-3 text-muted">{new Date(f.createdAt).toLocaleString("en-GB")}</td>
                <td className="px-4 py-3">
                  <RetryMessageButton messageId={f.id} conversationId={f.conversationId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
