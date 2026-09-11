import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { marketingTemplateService } from "@/services/marketingTemplateService";
import { emailProvider } from "@/lib/marketing/providers";
import { MarketingTemplateManager } from "@/components/admin/marketing/MarketingTemplateManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function EmailTemplatesPage() {
  await requireSection("marketing");
  const templates = await marketingTemplateService.list("Email");
  const provider = emailProvider();

  return (
    <div>
      <Link href="/admin/marketing/templates" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Templates
      </Link>
      <div className="mt-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink">Email Templates</h1>
        {!provider.isConfigured && (
          <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
            Email provider not configured — templates can be created and previewed, but SEND_EMAIL automation actions will be logged as Skipped until SMTP credentials are added.
          </p>
        )}
      </div>
      <div className="mt-6">
        <MarketingTemplateManager templates={templates} channel="Email" />
      </div>
    </div>
  );
}
