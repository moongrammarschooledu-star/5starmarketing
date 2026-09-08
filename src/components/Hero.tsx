import Image from "next/image";
import { ArrowRight, MessageCircle, Phone, Mail, MapPin } from "lucide-react";
import { site, whatsappLink } from "@/lib/site";

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-surface-muted">
      <div className="pointer-events-none absolute inset-0 diagonal-clip-tl bg-gradient-to-br from-burgundy-dark via-burgundy to-primary opacity-[0.06]" />

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-12 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pb-20 lg:pt-16">
        <div className="animate-fade-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-primary">
            Real Estate &amp; Builders · Lahore
          </div>

          <h1 className="font-heading text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
            Now You Will <span className="text-primary">Dream</span>
            <br />
            We Will Fulfill It
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
            Your trusted partner for property buying, selling, investment and
            construction solutions in Lahore.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <a
              href="#properties"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover"
            >
              Explore Properties <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full border-2 border-ink/15 px-6 py-3.5 text-sm font-bold text-ink transition-all hover:-translate-y-0.5 hover:border-ink/30"
            >
              Contact Us
            </a>
            <a
              href={whatsappLink("Hi 5STAR.M, I'm interested in your properties.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-success px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-success/25 transition-all hover:-translate-y-0.5"
            >
              <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
            </a>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-6 sm:max-w-md">
            <div>
              <div className="text-2xl font-extrabold text-ink">LDA</div>
              <div className="text-xs font-medium text-muted">Approved Societies</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-ink">Cash /</div>
              <div className="text-xs font-medium text-muted">Easy Installments</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-ink">100%</div>
              <div className="text-xs font-medium text-muted">Transparent Dealings</div>
            </div>
          </div>
        </div>

        <div className="relative animate-fade-up [animation-delay:150ms]">
          <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl shadow-2xl shadow-ink/20 sm:aspect-[5/4] sm:max-w-none lg:aspect-[4/5]">
            <Image
              src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop"
              alt="Modern luxury home built by 5STAR.M Estate & Builders"
              fill
              priority
              sizes="(min-width: 1024px) 480px, 90vw"
              className="object-cover"
            />
          </div>

          <div className="absolute -bottom-6 left-1/2 w-[92%] -translate-x-1/2 rounded-2xl bg-ink p-5 text-white shadow-xl sm:-bottom-8 sm:w-[85%]">
            <div className="grid grid-cols-1 gap-3 divide-y divide-white/10 text-sm sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-y-0">
              <a href={`tel:${site.phoneHref}`} className="flex items-center gap-2.5 pb-3 sm:justify-center sm:pb-0">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-semibold">{site.phoneDisplay}</span>
              </a>
              <a href={`mailto:${site.email}`} className="flex items-center gap-2.5 py-3 sm:justify-center sm:px-4 sm:py-0">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate font-semibold">{site.email}</span>
              </a>
              <div className="flex items-center gap-2.5 pt-3 sm:justify-center sm:pt-0">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-semibold">{site.addressShort}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
