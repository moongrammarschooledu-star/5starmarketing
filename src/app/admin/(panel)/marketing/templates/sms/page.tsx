import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { marketingTemplateService } from "@/services/marketingTemplateService";
import { smsProvider } from "@/lib/marketing/providers";
import { MarketingTemplateManager } from "@/components/admin/marketing/MarketingTemplateManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function SmsTemplatesPage() {
  await requireSection("marketing");
  const templates = await marketingTemplateService.list("SMS");
  const provider = smsProvider();

  return (
    <div>
      <Link href="/admin/marketing/templates" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Templates
      </Link>
      <div className="mt-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink">SMS Templates</h1>
        {!provider.isConfigured && (
          <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
            SMS provider not configured — templates can be created and previewed, but SEND_SMS automation actions will be logged as Skipped until a gateway is added.
          </p>
        )}
      </div>
      <div className="mt-6">
        <MarketingTemplateManager templates={templates} channel="SMS" />
      </div>
    </div>
  );
}
