import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HouseDesignerEditor } from "@/components/house/HouseDesignerEditor";
import { requireSection } from "@/lib/guard";
import { houseDesignService } from "@/services/houseDesignService";

export const metadata: Metadata = { title: "House Designer" };
export const dynamic = "force-dynamic";

export default async function HouseDesignEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mix?: string }> }) {
  await requireSection("construction");
  const { id } = await params;
  const { mix } = await searchParams;
  const [design, projects] = await Promise.all([houseDesignService.getById(id), houseDesignService.listProjectOptions().catch(() => [])]);
  if (!design) notFound();

  return (
    <div className="mx-auto max-w-7xl">
      <HouseDesignerEditor design={design} projects={projects} startMix={mix === "1"} />
    </div>
  );
}
