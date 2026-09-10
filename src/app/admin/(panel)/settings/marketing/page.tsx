import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { settingsService } from "@/services/settingsService";
import { requireSection } from "@/lib/guard";
import { MarketingSettingsForm } from "@/components/admin/MarketingSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminMarketingSettingsPage() {
  await requireSection("marketing");
  const settings = await settingsService.get();

  return (
    <div>
      <Link href="/admin/marketing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Marketing
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-extrabold text-ink">Marketing Settings</h1>
      <p className="mt-1 text-sm text-muted">Attribution defaults and the attribution window used across every campaign.</p>
      <div className="mt-6">
        <MarketingSettingsForm settings={settings} />
      </div>
    </div>
  );
}
