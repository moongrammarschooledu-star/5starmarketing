import type { Metadata } from "next";
import { NewDesignForm } from "@/components/house/NewDesignForm";
import { requireSection } from "@/lib/guard";
import { houseDesignService } from "@/services/houseDesignService";

export const metadata: Metadata = { title: "New House Design" };
export const dynamic = "force-dynamic";

export default async function NewHouseDesignPage() {
  await requireSection("construction");
  const projects = await houseDesignService.listProjectOptions().catch(() => []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">New House Design</h1>
      <p className="mt-1 text-sm text-muted">Choose the plot, then draw the rooms in the editor.</p>
      <div className="mt-6">
        <NewDesignForm projects={projects} />
      </div>
    </div>
  );
}
