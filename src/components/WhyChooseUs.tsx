import { CheckCircle2 } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

const points = [
  "Professional Real Estate Guidance",
  "Trusted Property Solutions",
  "LDA-Approved Society Focus",
  "Flexible Payment Options",
  "Customer-Focused Service",
  "Transparent Dealings",
  "Property & Construction Expertise",
  "Long-Term Support",
];

export function WhyChooseUs() {
  return (
    <section className="relative overflow-hidden bg-ink py-20 sm:py-24">
      <div className="pointer-events-none absolute inset-0 diagonal-clip-br bg-gradient-to-tl from-primary via-burgundy to-transparent opacity-20" />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeading
          eyebrow="Why 5STAR.M"
          title="Why Choose"
          highlight="5STAR.M?"
          description="A property partner built on transparent dealings and long-term relationships — not just a single transaction."
          align="center"
          light
        />

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((point) => (
            <div
              key={point}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="text-sm font-semibold text-white/90">{point}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
