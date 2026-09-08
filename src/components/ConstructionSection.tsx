import Image from "next/image";
import { Hammer, Building, ClipboardList, BadgeCheck } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

const highlights = [
  { icon: Building, title: "Building Solutions", text: "Practical construction solutions tailored to your plot and budget." },
  { icon: Hammer, title: "Residential Construction", text: "Quality-focused construction for homes, from foundation to finish." },
  { icon: ClipboardList, title: "Property Development", text: "Planning and development support for residential and commercial sites." },
  { icon: BadgeCheck, title: "Construction Consultation", text: "Honest, practical advice at every stage of your build." },
];

export function ConstructionSection() {
  return (
    <section className="bg-surface-muted py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative order-2 aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-xl shadow-ink/10 lg:order-1">
            <Image
              src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=1200&auto=format&fit=crop"
              alt="Construction and building solutions by 5STAR.M"
              fill
              sizes="(min-width: 1024px) 560px, 90vw"
              className="object-cover"
            />
          </div>

          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="Construction & Builders"
              title="From Property to"
              highlight="Possession"
              description="Beyond real estate, 5STAR.M offers construction and building solutions — helping turn a plot of land into a finished, quality-built home."
            />

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {highlights.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-ink">{title}</div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
