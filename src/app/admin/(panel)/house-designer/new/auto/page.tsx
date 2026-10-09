import type { Metadata } from "next";
import Link from "next/link";
import { NewDesignForm } from "@/components/house/NewDesignForm";
import { requireSection } from "@/lib/guard";
import { houseDesignService } from "@/services/houseDesignService";

export const metadata: Metadata = { title: "Make a House Design Automatically" };
export const dynamic = "force-dynamic";

export default async function AutoHouseDesignPage() {
  await requireSection("construction");
  const projects = await houseDesignService.listProjectOptions().catch(() => []);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/house-designer/new" className="text-xs font-bold text-primary hover:underline">
        &larr; Back to the two ways
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Make it automatically</h1>
      <p className="mt-1 text-sm text-muted">Give the plot size and the rooms you want. The naqsha, 3D view and elevations are made for you.</p>
      <div className="mt-6">
        <NewDesignForm projects={projects} mode="auto" />
      </div>
    </div>
  );
}
