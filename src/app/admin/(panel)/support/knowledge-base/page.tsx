import { kbService } from "@/services/kbService";
import { supportCategoryService } from "@/services/supportCategoryService";
import { requireSection } from "@/lib/guard";
import { KbArticleManager } from "@/components/support/KbArticleManager";

export const dynamic = "force-dynamic";

export default async function KnowledgeBasePage() {
  await requireSection("support");
  const [articles, categories] = await Promise.all([kbService.listAdmin(), supportCategoryService.list(true)]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Knowledge Base</h1>
      <p className="mt-1 text-sm text-muted">Nothing is published automatically — an admin reviews every article before it goes live.</p>
      <div className="mt-6">
        <KbArticleManager articles={articles} categories={categories} />
      </div>
    </div>
  );
}
