import { requireSection } from "@/lib/guard";
import { profileService } from "@/services/profileService";
import { canManageAiSettings } from "@/lib/permissions";
import { aiConfigService } from "@/services/aiConfigService";
import { AiSettingsForm } from "./AiSettingsForm";

export const dynamic = "force-dynamic";

export default async function AiSettingsPage() {
  await requireSection("ai");
  const admin = await profileService.getCurrentAdmin();
  const canManage = admin ? canManageAiSettings(admin.role) : false;
  const configs = await aiConfigService.listAll();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">AI Settings</h1>
      <p className="mt-1 text-sm text-muted">
        Enable/disable the assistant globally or per role, control which tools it may call, whether it may propose
        write actions, and how long conversations are retained.
      </p>
      {!canManage && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          You can view these settings but only an Admin, Super Admin or Sales Manager can change them.
        </p>
      )}
      <AiSettingsForm initialConfigs={configs} readOnly={!canManage} />
    </div>
  );
}
