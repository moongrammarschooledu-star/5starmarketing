import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { constructionSettingsService } from "@/services/constructionSettingsService";
import { profileService } from "@/services/profileService";
import { canManageConstruction } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { ConstructionSettingsForm } from "@/components/admin/construction/ConstructionSettingsForm";

export const dynamic = "force-dynamic";

export default async function ConstructionSettingsPage() {
  await requireSection("construction");
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canManageConstruction(admin.role)) redirect("/admin/construction");

  const settings = await constructionSettingsService.get();

  return (
    <div>
      <Link href="/admin/construction" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Construction
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Construction Settings</h1>
      <p className="mt-1 text-sm text-muted">Budget alert thresholds, default retention percentage, and currency.</p>

      <div className="mt-6">
        <ConstructionSettingsForm settings={settings} />
      </div>
    </div>
  );
}
