import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { marketDataService } from "@/services/marketDataService";
import { profileService } from "@/services/profileService";
import { canManageFinance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { MarketDataManager } from "@/components/admin/investment/MarketDataManager";

export const dynamic = "force-dynamic";

export default async function AdminMarketDataPage() {
  await requireSection("investment");
  const [records, admin] = await Promise.all([marketDataService.list(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageFinance(admin.role) : false;

  return (
    <div>
      <Link href="/admin/investment" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Investment
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Market Data</h1>
      <p className="mt-1 text-sm text-muted">Admin-managed market intelligence. Only VERIFIED records feed official valuations, confidence scoring, and public market comparisons.</p>

      <div className="mt-6">
        <MarketDataManager records={records} canManage={canManage} />
      </div>
    </div>
  );
}
