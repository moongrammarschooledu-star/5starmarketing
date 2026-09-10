import { CheckCircle2, XCircle } from "lucide-react";
import type { PlatformIntegration } from "@/lib/integrations";

export function PlatformIntegrationsStatus({ integrations }: { integrations: PlatformIntegration[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-heading text-sm font-bold text-ink">Platform Integrations</h3>
      <p className="mt-1 text-xs text-muted">
        Campaign tracking works fully without these — they&apos;re only for pulling live ad spend/reach directly from each
        platform in the future.
      </p>
      <div className="mt-3 space-y-2">
        {integrations.map((i) => (
          <div key={i.id} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm">
            <span className="font-semibold text-ink">{i.name}</span>
            {i.isConfigured ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
                <XCircle className="h-3.5 w-3.5" /> Integration not configured.
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
