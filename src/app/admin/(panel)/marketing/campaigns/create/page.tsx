import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { requireSection } from "@/lib/guard";
import { CampaignForm } from "@/components/admin/CampaignForm";

export const dynamic = "force-dynamic";

export default async function AdminCampaignCreatePage() {
  await requireSection("marketing");
  const [properties, projects] = await Promise.all([propertyService.list(), projectService.list()]);

  return (
    <div>
      <Link href="/admin/marketing/campaigns" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Campaigns
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-extrabold text-ink">New Campaign</h1>
      <p className="mt-1 text-sm text-muted">
        Tracks performance and lead attribution — this does not connect to Facebook, Google, TikTok or any other ad platform.
      </p>
      <div className="mt-6">
        <CampaignForm
          properties={properties.map((p) => ({ id: p.id, title: p.title }))}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>
    </div>
  );
}
