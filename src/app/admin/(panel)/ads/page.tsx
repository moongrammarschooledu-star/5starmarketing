import type { Metadata } from "next";
import { AdMakerHub } from "@/components/admin/AdMakerHub";
import { requireSection } from "@/lib/guard";

export const metadata: Metadata = { title: "Ad Maker" };
export const dynamic = "force-dynamic";

export default async function AdMakerPage() {
  await requireSection("brochures");

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Ad Maker</h1>
      <p className="mt-1 text-sm text-muted">
        Make an ad for anything: a poster picture with your own details, pictures and colors, or a video ad with a voice.
      </p>
      <div className="mt-6">
        <AdMakerHub />
      </div>
    </div>
  );
}
