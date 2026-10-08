import type { Metadata } from "next";
import { AdMakerPanel } from "@/components/admin/AdMakerPanel";
import { requireSection } from "@/lib/guard";

export const metadata: Metadata = { title: "Ad Maker" };
export const dynamic = "force-dynamic";

export default async function AdMakerPage() {
  await requireSection("brochures");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Ad Maker</h1>
      <p className="mt-1 text-sm text-muted">
        Make a company ad video from your own pictures and a description. A female voice reads the description, then the company&apos;s contact details.
      </p>
      <div className="mt-6">
        <AdMakerPanel />
      </div>
    </div>
  );
}
