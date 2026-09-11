import Link from "next/link";
import { Mail, MessageCircle, Smartphone } from "lucide-react";
import { marketingTemplateService } from "@/services/marketingTemplateService";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function MarketingTemplatesIndexPage() {
  await requireSection("marketing");
  const [email, whatsapp, sms] = await Promise.all([
    marketingTemplateService.list("Email"),
    marketingTemplateService.list("WhatsApp"),
    marketingTemplateService.list("SMS"),
  ]);

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">Marketing Templates</h1>
        <p className="mt-1 text-sm text-muted">Reusable, variable-driven message content for automation actions — used only when a real provider is configured.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/admin/marketing/templates/email" className="rounded-2xl border border-border bg-surface p-5 hover:border-primary">
          <Mail className="h-6 w-6 text-primary" />
          <p className="mt-3 font-heading text-lg font-bold text-ink">Email</p>
          <p className="mt-1 text-sm text-muted">{email.length} template(s)</p>
        </Link>
        <Link href="/admin/marketing/templates/whatsapp" className="rounded-2xl border border-border bg-surface p-5 hover:border-primary">
          <MessageCircle className="h-6 w-6 text-primary" />
          <p className="mt-3 font-heading text-lg font-bold text-ink">WhatsApp</p>
          <p className="mt-1 text-sm text-muted">{whatsapp.length} template(s)</p>
        </Link>
        <Link href="/admin/marketing/templates/sms" className="rounded-2xl border border-border bg-surface p-5 hover:border-primary">
          <Smartphone className="h-6 w-6 text-primary" />
          <p className="mt-3 font-heading text-lg font-bold text-ink">SMS</p>
          <p className="mt-1 text-sm text-muted">{sms.length} template(s)</p>
        </Link>
      </div>
    </div>
  );
}
