"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Ruler, MessageCircle, Star } from "lucide-react";
import type { Property } from "@/lib/models/property";
import { whatsappLink } from "@/lib/site";
import { trackWhatsAppLeadAction } from "@/lib/actions/leads.actions";

const statusBadgeStyle: Record<string, string> = {
  Reserved: "bg-ink/80 text-white",
  Sold: "bg-ink/80 text-white",
  Inactive: "bg-ink/80 text-white",
};

export function PropertyCard({ property }: { property: Property }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-xl hover:shadow-ink/10">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={property.images[0]}
          alt={property.title}
          fill
          sizes="(min-width: 1024px) 380px, 90vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
          {property.type}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">
          {property.purpose}
        </span>
        {property.featured && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-primary shadow">
            <Star className="h-3 w-3 fill-primary text-primary" /> Featured
          </span>
        )}
        {property.status !== "Available" && (
          <span
            className={`absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadgeStyle[property.status]}`}
          >
            {property.status}
          </span>
        )}
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
          <Link
            href={`/properties/${property.slug}`}
            className="flex items-center justify-center rounded-full border-2 border-ink/15 px-3 py-2.5 text-xs font-bold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            View Details
          </Link>
          <a
            href={whatsappLink(
              `Assalam-o-Alaikum 5STAR.M Estate & Builders,\n\nI am interested in:\n\nProperty: ${property.title}\nLocation: ${property.location}\nSize: ${property.size}\n\nPlease share the complete details, price and payment plan.\n\nThank you.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsAppLeadAction(property.title, property.id)}
            className="flex items-center justify-center gap-1.5 rounded-full bg-success px-3 py-2.5 text-xs font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Inquiry
          </a>
        </div>
      </div>
    </article>
  );
}
