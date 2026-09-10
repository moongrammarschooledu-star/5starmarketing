import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { campaignService } from "@/services/campaignService";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { requireSection } from "@/lib/guard";
import { CampaignForm } from "@/components/admin/CampaignForm";

export const dynamic = "force-dynamic";

export default async function AdminCampaignEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("marketing");
  const { id } = await params;

  const [campaign, properties, projects] = await Promise.all([campaignService.getById(id), propertyService.list(), projectService.list()]);
  if (!campaign) notFound();

  return (
    <div>
      <Link href={`/admin/marketing/campaigns/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to {campaign.name}
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-extrabold text-ink">Edit Campaign</h1>
      <div className="mt-6">
        <CampaignForm
          campaign={campaign}
          properties={properties.map((p) => ({ id: p.id, title: p.title }))}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>
    </div>
  );
}
