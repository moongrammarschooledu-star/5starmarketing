import type { Metadata } from "next";
import Link from "next/link";
import { UploadDesignForm } from "@/components/house/UploadDesignForm";
import { requireSection } from "@/lib/guard";
import { houseDesignService } from "@/services/houseDesignService";

export const metadata: Metadata = { title: "Design From a Hand-Drawn Naqsha" };
export const dynamic = "force-dynamic";

export default async function UploadHouseDesignPage() {
  await requireSection("construction");
  const projects = await houseDesignService.listProjectOptions().catch(() => []);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/house-designer/new" className="text-xs font-bold text-primary hover:underline">
        &larr; Back to the ways
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">From my hand-drawn naqsha</h1>
      <p className="mt-1 text-sm text-muted">Upload a picture of the naqsha drawn on paper. It is read and turned into a proper plan with 3D view and elevations.</p>
      <div className="mt-6">
        <UploadDesignForm projects={projects} />
      </div>
    </div>
  );
}