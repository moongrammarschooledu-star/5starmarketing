import type { Metadata } from "next";
import Link from "next/link";
import { ImageUp, PencilRuler, Shuffle, Wand2 } from "lucide-react";
import { requireSection } from "@/lib/guard";

export const metadata: Metadata = { title: "New House Design" };
export const dynamic = "force-dynamic";

const ways = [
  {
    href: "/admin/house-designer/new/manual",
    icon: PencilRuler,
    title: "Draw it myself",
    text: "Choose the plot, then place and resize every room, door and window yourself on the plan. Full control, like drawing on paper.",
    button: "Start drawing",
  },
  {
    href: "/admin/house-designer/new/auto",
    icon: Wand2,
    title: "Make it automatically",
    text: "Tell us the plot size and how many bedrooms, bathrooms, kitchen, TV lounge and so on. A complete naqsha with doors and windows is made for you.",
    button: "Make my naqsha",
  },
  {
    href: "/admin/house-designer/new/mix",
    icon: Shuffle,
    title: "Auto, then adjust by hand",
    text: "The system makes a first plan from your room list, and you continue by hand: move rooms, resize them, change doors and windows.",
    button: "Make first plan",
  },
  {
    href: "/admin/house-designer/new/upload",
    icon: ImageUp,
    title: "From my hand-drawn naqsha",
    text: "Upload a photo of a naqsha drawn on paper. It is read and turned into a proper digital plan with 3D view and elevations.",
    button: "Upload a picture",
  },
];

export default async function NewHouseDesignChoicePage() {
  await requireSection("construction");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">New House Design</h1>
      <p className="mt-1 text-sm text-muted">How do you want to make the naqsha?</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ways.map((w) => (
          <Link key={w.href} href={w.href} className="group flex flex-col rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary">
            <w.icon className="h-8 w-8 text-primary" />
            <h2 className="mt-4 font-heading text-lg font-bold text-ink group-hover:text-primary">{w.title}</h2>
            <p className="mt-2 flex-1 text-sm text-muted">{w.text}</p>
            <span className="mt-4 inline-block self-start rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">{w.button}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}