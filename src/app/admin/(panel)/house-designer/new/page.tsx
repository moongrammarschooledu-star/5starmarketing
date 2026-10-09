import type { Metadata } from "next";
import Link from "next/link";
import { PencilRuler, Wand2 } from "lucide-react";
import { requireSection } from "@/lib/guard";

export const metadata: Metadata = { title: "New House Design" };
export const dynamic = "force-dynamic";

export default async function NewHouseDesignChoicePage() {
  await requireSection("construction");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">New House Design</h1>
      <p className="mt-1 text-sm text-muted">How do you want to make the naqsha?</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/admin/house-designer/new/manual" className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary">
          <PencilRuler className="h-8 w-8 text-primary" />
          <h2 className="mt-4 font-heading text-lg font-bold text-ink group-hover:text-primary">Draw it myself</h2>
          <p className="mt-2 text-sm text-muted">
            Choose the plot, then place and resize every room, door and window yourself on the plan. Full control, like drawing on paper.
          </p>
          <span className="mt-4 inline-block rounded-full bg-ink px-5 py-2 text-sm font-bold text-white">Start drawing</span>
        </Link>

        <Link href="/admin/house-designer/new/auto" className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary">
          <Wand2 className="h-8 w-8 text-primary" />
          <h2 className="mt-4 font-heading text-lg font-bold text-ink group-hover:text-primary">Make it automatically</h2>
          <p className="mt-2 text-sm text-muted">
            Tell us the plot size and how many bedrooms, bathrooms, kitchen, TV lounge and so on. A complete naqsha with doors and windows is made for you.
          </p>
          <span className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Make my naqsha</span>
        </Link>
      </div>
    </div>
  );
}
