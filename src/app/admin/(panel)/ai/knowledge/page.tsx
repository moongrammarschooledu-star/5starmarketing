import { requireSection } from "@/lib/guard";
import { profileService } from "@/services/profileService";
import { canManageAiSettings } from "@/lib/permissions";
import { aiKnowledgeService } from "@/services/aiKnowledgeService";
import { KnowledgePanel } from "./KnowledgePanel";

export const dynamic = "force-dynamic";

export default async function AiKnowledgePage() {
  await requireSection("ai");
  const admin = await profileService.getCurrentAdmin();
  const canManage = admin ? canManageAiSettings(admin.role) : false;
  const sources = await aiKnowledgeService.listAll();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">AI Knowledge Sources</h1>
      <p className="mt-1 text-sm text-muted">
        Curated internal notes and policy guidance the AI prefers over unverified data. Only published, customer-visibility
        entries are ever shown to the customer portal assistant.
      </p>
      <KnowledgePanel initialSources={sources} readOnly={!canManage} />
    </div>
  );
}
