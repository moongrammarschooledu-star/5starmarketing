import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { marketingTemplateService } from "@/services/marketingTemplateService";
import { whatsappProvider } from "@/lib/marketing/providers";
import { MarketingTemplateManager } from "@/components/admin/marketing/MarketingTemplateManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function CommunicationWhatsAppTemplatesPage() {
  await requireSection("communications");
  const templates = await marketingTemplateService.list("WhatsApp");
  const provider = whatsappProvider();

  return (
    <div>
      <Link href="/admin/communications/templates" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Templates
      </Link>
      <div className="mt-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink">WhatsApp Templates</h1>
        <p className="mt-1 text-sm text-muted">
          Separate from the older WhatsApp bulk-messaging templates (WhatsApp → Templates) — these are used by the composer and by Marketing Automation.
        </p>
        {!provider.isConfigured && (
          <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
            WhatsApp Business API not configured — templates can be created and previewed, but sending is unavailable until credentials are added in Settings.
          </p>
        )}
      </div>
      <div className="mt-6">
        <MarketingTemplateManager templates={templates} channel="WhatsApp" />
      </div>
    </div>
  );
}
