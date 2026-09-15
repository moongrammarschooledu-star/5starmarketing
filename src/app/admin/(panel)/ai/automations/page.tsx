import { requireSection } from "@/lib/guard";
import { profileService } from "@/services/profileService";
import { canManageAiSettings } from "@/lib/permissions";
import { aiAutomationService } from "@/services/aiAutomationService";
import { AutomationsPanel } from "./AutomationsPanel";

export const dynamic = "force-dynamic";

export default async function AiAutomationsPage() {
  await requireSection("ai");
  const admin = await profileService.getCurrentAdmin();
  const canManage = admin ? canManageAiSettings(admin.role) : false;
  const [rules, runs] = await Promise.all([aiAutomationService.listRules(), aiAutomationService.listRuns()]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">AI Automations</h1>
      <p className="mt-1 text-sm text-muted">
        Trigger → condition → AI analysis → suggested action → approval → execution. Every run lands in the human
        approval queue (Activity Log) — nothing here sends anything externally on its own.
      </p>
      <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
        This deployment has no scheduled/cron infrastructure wired up yet, so time-based triggers (e.g. lease expiry)
        run when you open the Insights page rather than automatically in the background. Record-created triggers
        (e.g. a new lead) fire immediately from the relevant action once you enable a rule below.
      </p>
      <AutomationsPanel initialRules={rules} initialRuns={runs} readOnly={!canManage} />
    </div>
  );
}
