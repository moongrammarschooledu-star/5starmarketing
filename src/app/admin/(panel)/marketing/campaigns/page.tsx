import Link from "next/link";
import { AlertTriangle, PlusCircle } from "lucide-react";
import { campaignService } from "@/services/campaignService";
import { requireSection } from "@/lib/guard";
import { CampaignsTable } from "@/components/admin/CampaignsTable";
import { campaignStatuses } from "@/lib/models/campaign";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireSection("marketing");
  const { status } = await searchParams;

  let campaigns: Awaited<ReturnType<typeof campaignService.list>> = [];
  let loadError: string | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    campaigns = await campaignService.list(status ? { status: status as any } : undefined);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load campaigns.";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Campaigns</h1>
          <p className="mt-1 text-sm text-muted">Select two or more to compare. Nothing here claims a platform API connection.</p>
        </div>
        <Link href="/admin/marketing/campaigns/create" className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
          <PlusCircle className="h-4.5 w-4.5" /> New Campaign
        </Link>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-1.5 rounded-full border border-border bg-surface p-1 lg:w-fit">
        <Link
          href="/admin/marketing/campaigns"
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${!status ? "bg-primary text-primary-foreground" : "text-muted hover:text-ink"}`}
        >
          All
        </Link>
        {campaignStatuses.map((s) => (
          <Link
            key={s}
            href={`/admin/marketing/campaigns?status=${s}`}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${status === s ? "bg-primary text-primary-foreground" : "text-muted hover:text-ink"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <CampaignsTable campaigns={campaigns} />
      </div>
    </div>
  );
}
