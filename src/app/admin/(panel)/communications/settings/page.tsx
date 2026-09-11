import { redirect } from "next/navigation";
import { communicationService } from "@/services/communicationService";
import { emailProvider, whatsappProvider, smsProvider } from "@/lib/marketing/providers";
import { profileService } from "@/services/profileService";
import { canManageCommunicationSettings } from "@/lib/permissions";
import { CommunicationSettingsForm } from "@/components/admin/communications/CommunicationSettingsForm";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function CommunicationSettingsPage() {
  await requireSection("communications");
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canManageCommunicationSettings(admin.role)) redirect("/admin/communications");

  const settings = await communicationService.getSettings();
  const providers = {
    whatsapp: whatsappProvider().isConfigured,
    email: emailProvider().isConfigured,
    sms: smsProvider().isConfigured,
  };

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Communication Settings</h1>
      <p className="mt-1 text-sm text-muted">Provider status, test mode, and business hours for every outbound channel.</p>

      <div className="mt-6">
        <CommunicationSettingsForm settings={settings} providers={providers} />
      </div>
    </div>
  );
}
