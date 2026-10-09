import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DesignList } from "@/components/house/DesignList";
import { requireSection } from "@/lib/guard";
import { houseDesignService } from "@/services/houseDesignService";

export const metadata: Metadata = { title: "House Designer" };
export const dynamic = "force-dynamic";

export default async function HouseDesignerPage() {
  await requireSection("construction");
  let designs: Awaited<ReturnType<typeof houseDesignService.list>> = [];
  let loadError: string | null = null;
  try {
    designs = await houseDesignService.list();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the designs.";
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">House Designer</h1>
          <p className="mt-1 text-sm text-muted">Draw house plans (naqsha), see them in 3D and get the front elevation - for construction.</p>
        </div>
        <Link href="/admin/house-designer/new" className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> New Design
        </Link>
      </div>
      {loadError && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{loadError}</p>}
      <div className="mt-6">
        <DesignList designs={designs} />
      </div>
    </div>
  );
}
