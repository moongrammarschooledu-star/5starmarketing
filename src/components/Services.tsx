import { ArrowRight } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { services } from "@/lib/data/services";

export function Services() {
  return (
    <section id="services" className="bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeading
          eyebrow="What We Do"
          title="Our"
          highlight="Services"
          description="End-to-end real estate and construction support — from finding the right property to building it."
          align="center"
        />

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group flex flex-col rounded-2xl border border-border bg-surface p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-ink/5"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 font-heading text-base font-bold text-ink">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{description}</p>
              <a
                href="#contact"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary"
              >
                Learn More <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
