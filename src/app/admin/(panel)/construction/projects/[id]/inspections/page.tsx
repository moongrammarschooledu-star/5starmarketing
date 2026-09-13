import { constructionSiteReportService } from "@/services/constructionSiteReportService";
import { SiteReportManager } from "@/components/admin/construction/SiteReportManager";

export const dynamic = "force-dynamic";

export default async function ConstructionSiteReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [reports, media] = await Promise.all([constructionSiteReportService.list(id), constructionSiteReportService.listMedia(id)]);

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Daily Site Reports</h2>
      <SiteReportManager projectId={id} reports={reports} media={media} />
    </div>
  );
}
