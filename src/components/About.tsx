import Image from "next/image";
import { ShieldCheck, Handshake, TrendingUp, Users2 } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { site } from "@/lib/site";

const pillars = [
  { icon: ShieldCheck, label: "Trust & Transparency" },
  { icon: Handshake, label: "Professional Guidance" },
  { icon: TrendingUp, label: "Property Investment" },
  { icon: Users2, label: "Customer Satisfaction" },
];

export function About() {
  return (
    <section id="about" className="bg-surface-muted py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="relative">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-xl shadow-ink/10">
            <Image
              src="https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=1200&auto=format&fit=crop"
              alt="5STAR.M Estate & Builders residential development"
              fill
              sizes="(min-width: 1024px) 560px, 90vw"
              className="object-cover"
            />
          </div>

          <div className="absolute -bottom-6 -right-4 w-56 rounded-2xl bg-ink p-5 text-white shadow-xl sm:-right-8 sm:w-64">
            <div className="font-heading text-lg font-extrabold">{site.director}</div>
            <div className="text-xs font-semibold text-primary">{site.directorTitle}</div>
            <p className="mt-2 text-xs leading-relaxed text-white/70">
              Leading 5STAR.M Estate &amp; Builders with a focus on trust and
              long-term client relationships.
            </p>
          </div>
        </div>

        <div>
          <SectionHeading
            eyebrow="About Us"
            title="5STAR.M"
            highlight="Estate & Builders"
            description="5STAR.M Estate & Builders is a professional real-estate and construction business focused on helping clients find reliable property opportunities and practical building solutions."
          />

          <p className="mt-5 text-sm leading-relaxed text-muted sm:text-base">
            We work closely with every client to make property buying,
            selling and investment straightforward — with honest advice,
            clear communication and a long-term view on the relationship,
            not just the transaction.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {pillars.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="text-sm font-semibold text-ink">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
