import type { Metadata } from "next";
import Link from "next/link";
import { NewDesignForm } from "@/components/house/NewDesignForm";
import { requireSection } from "@/lib/guard";
import { houseDesignService } from "@/services/houseDesignService";

export const metadata: Metadata = { title: "Automatic Plan, Then Adjust" };
export const dynamic = "force-dynamic";

export default async function MixHouseDesignPage() {
  await requireSection("construction");
  const projects = await houseDesignService.listProjectOptions().catch(() => []);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/house-designer/new" className="text-xs font-bold text-primary hover:underline">
        &larr; Back to the ways
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Auto, then adjust by hand</h1>
      <p className="mt-1 text-sm text-muted">The system makes a first plan from your room list. Then you move rooms, resize them and change doors and windows yourself.</p>
      <div className="mt-6">
        <NewDesignForm projects={projects} mode="mix" />
      </div>
    </div>
  );
}