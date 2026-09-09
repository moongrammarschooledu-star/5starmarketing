import { whatsappService } from "@/services/whatsappService";
import { WhatsAppTemplatesManager } from "@/components/admin/WhatsAppTemplatesManager";

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppTemplatesPage() {
  const templates = await whatsappService.listTemplates();

  return <WhatsAppTemplatesManager templates={templates} />;
}
