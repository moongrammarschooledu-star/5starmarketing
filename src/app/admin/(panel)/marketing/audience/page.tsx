import { marketingTagService } from "@/services/marketingTagService";
import { marketingSegmentService } from "@/services/marketingSegmentService";
import { TagManager } from "@/components/admin/marketing/TagManager";
import { SegmentManager } from "@/components/admin/marketing/SegmentManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AudiencePage() {
  await requireSection("marketing");
  const [tags, segments] = await Promise.all([marketingTagService.list(), marketingSegmentService.list()]);

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">Audience</h1>
        <p className="mt-1 text-sm text-muted">Tags for organizing individual leads, and saved segments for reusable dynamic filters.</p>
      </div>
      <div className="mt-6 space-y-6">
        <TagManager tags={tags} />
        <SegmentManager segments={segments} />
      </div>
    </div>
  );
}
