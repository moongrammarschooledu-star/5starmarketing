import { ShieldCheck, Handshake, TrendingUp, Users2 } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { CompanyVideo } from "./CompanyVideo";
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
        <div className="relative mx-auto w-full max-w-[320px] sm:max-w-[360px]">
          <div className="relative aspect-[9/16] w-full overflow-hidden rounded-3xl bg-ink shadow-xl shadow-ink/10">
            <CompanyVideo className="absolute inset-0 h-full w-full object-cover" />
          </div>

          {/* Below the video, not over it - the video itself shows the logo. */}
          <div className="mt-5 w-full rounded-2xl bg-ink p-4 text-white shadow-xl sm:p-5">
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
