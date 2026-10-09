import type { Metadata } from "next";
import Link from "next/link";
import { NewDesignForm } from "@/components/house/NewDesignForm";
import { requireSection } from "@/lib/guard";
import { houseDesignService } from "@/services/houseDesignService";

export const metadata: Metadata = { title: "Draw a House Design" };
export const dynamic = "force-dynamic";

export default async function ManualHouseDesignPage() {
  await requireSection("construction");
  const projects = await houseDesignService.listProjectOptions().catch(() => []);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/house-designer/new" className="text-xs font-bold text-primary hover:underline">
        &larr; Back to the two ways
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Draw it myself</h1>
      <p className="mt-1 text-sm text-muted">Choose the plot, then draw the rooms in the editor.</p>
      <div className="mt-6">
        <NewDesignForm projects={projects} mode="manual" />
      </div>
    </div>
  );
}
