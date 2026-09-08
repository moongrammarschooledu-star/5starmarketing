import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { whatsappLink } from "@/lib/site";

export function InvestmentSection() {
  return (
    <section id="investment" className="bg-surface py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <SectionHeading
            eyebrow="Property Investment"
            title="Invest in Your"
            highlight="Future"
            description="Property remains one of the most practical, long-term ways to build value — a home for your family today, and an asset for tomorrow."
          />

          <p className="mt-5 text-sm leading-relaxed text-muted sm:text-base">
            Our team helps you understand the market, evaluate opportunities
            in LDA-approved societies, and choose payment plans — cash or
            easy monthly installments — that fit your goals. We focus on
            practical, well-informed decisions rather than promises of
            guaranteed returns.
          </p>

          <a
            href={whatsappLink(
              "Hi 5STAR.M, I'd like to talk to your property consultant about investment options."
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover"
          >
            <MessageCircle className="h-4 w-4" /> Talk to Our Property Consultant
          </a>
        </div>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-xl shadow-ink/10">
          <Image
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1200&auto=format&fit=crop"
            alt="Property investment opportunities with 5STAR.M"
            fill
            sizes="(min-width: 1024px) 560px, 90vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
