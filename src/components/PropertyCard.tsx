import Image from "next/image";
import { MapPin, Ruler, MessageCircle } from "lucide-react";
import type { Property } from "@/lib/data/properties";
import { whatsappLink } from "@/lib/site";

export function PropertyCard({ property }: { property: Property }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-xl hover:shadow-ink/10">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={property.image}
          alt={property.title}
          fill
          sizes="(min-width: 1024px) 380px, 90vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
          {property.type}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">
          For {property.purpose}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-heading text-lg font-bold text-ink">{property.title}</h3>

        <div className="mt-2 flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          {property.location}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <Ruler className="h-4 w-4 shrink-0 text-primary" />
          {property.size}
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">
          {property.description}
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div>
            <div className="text-base font-extrabold text-primary">{property.price}</div>
            <div className="text-[11px] font-medium text-muted-foreground">
              {property.paymentOption}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <a
            href="#contact"
            className="flex items-center justify-center rounded-full border-2 border-ink/15 px-3 py-2.5 text-xs font-bold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            View Details
          </a>
          <a
            href={whatsappLink(
              `Hi 5STAR.M, I'm interested in "${property.title}" (${property.location}). Please share more details.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-full bg-success px-3 py-2.5 text-xs font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Inquiry
          </a>
        </div>
      </div>
    </article>
  );
}
