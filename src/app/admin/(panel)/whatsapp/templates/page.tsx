import { whatsappService } from "@/services/whatsappService";
import { WhatsAppTemplatesManager } from "@/components/admin/WhatsAppTemplatesManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppTemplatesPage() {
  await requireSection("whatsapp");
  const templates = await whatsappService.listTemplates();

  return <WhatsAppTemplatesManager templates={templates} />;
}
