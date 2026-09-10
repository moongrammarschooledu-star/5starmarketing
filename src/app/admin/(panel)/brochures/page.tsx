import Link from "next/link";
import { AlertTriangle, FileText, Sparkles, Building2, FolderKanban, PlusCircle } from "lucide-react";
import { brochureService } from "@/services/brochureService";
import { requireSection } from "@/lib/guard";
import { StatCard } from "@/components/admin/StatCard";
import { BrochuresTable } from "@/components/admin/BrochuresTable";

export const dynamic = "force-dynamic";

export default async function AdminBrochuresPage() {
  await requireSection("brochures");

  let brochures: Awaited<ReturnType<typeof brochureService.list>> = [];
  let loadError: string | null = null;
  try {
    brochures = await brochureService.list();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load brochures.";
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentlyGenerated = brochures.filter((b) => b.generatedFile && b.updatedAt >= sevenDaysAgo).length;
  const propertyBrochures = brochures.filter((b) => b.type === "property").length;
  const projectBrochures = brochures.filter((b) => b.type === "project").length;

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Property Brochure Center</h1>
          <p className="mt-1 text-sm text-muted">Create, preview and generate professional PDF brochures.</p>
        </div>
        <Link
          href="/admin/brochures/create"
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <PlusCircle className="h-4 w-4" /> Create Brochure
        </Link>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Brochures" value={brochures.length} icon={FileText} />
        <StatCard label="Recently Generated" value={recentlyGenerated} icon={Sparkles} tone="primary" />
        <StatCard label="Property Brochures" value={propertyBrochures} icon={Building2} />
        <StatCard label="Project Brochures" value={projectBrochures} icon={FolderKanban} />
      </div>

      <div className="mt-8">
        <BrochuresTable brochures={brochures} />
      </div>
    </div>
  );
}
