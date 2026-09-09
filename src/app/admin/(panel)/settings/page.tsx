import { settingsService } from "@/services/settingsService";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireSection("settings");
  const settings = await settingsService.get();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Website Settings</h1>
      <p className="mt-1 text-sm text-muted">Manage your business information and branding.</p>

      <div className="mt-6">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
