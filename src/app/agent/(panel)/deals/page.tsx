import Link from "next/link";
import { profileService } from "@/services/profileService";
import { dealService } from "@/services/dealService";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AgentDealsPage() {
  const admin = await profileService.getCurrentAdmin();
  const result = admin ? await dealService.search({ agentId: admin.id, pageSize: 30 }) : null;
  const deals = result?.deals ?? [];

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">My Deals</h1>
      <p className="mt-1 text-sm text-muted">Deals you&apos;re the agent on.</p>

      <div className="mt-5 space-y-3">
        {deals.map((d) => (
          <Link key={d.id} href={`/admin/deals/${d.id}`} className="block rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="font-heading text-sm font-bold text-ink">{d.dealNumber}</p>
              <StatusBadge status={d.status} />
            </div>
            <p className="mt-1 text-xs text-muted">{d.leadName ?? "—"}</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-bold text-primary">Rs {d.finalAmount.toLocaleString()}</span>
              <span className="text-muted">Outstanding: Rs {d.outstandingAmount.toLocaleString()}</span>
            </div>
          </Link>
        ))}
        {deals.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted">
            No deals assigned to you yet.
          </p>
        )}
      </div>
    </div>
  );
}
