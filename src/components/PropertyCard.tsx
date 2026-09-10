"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Ruler, MessageCircle, Star, BedDouble, Bath } from "lucide-react";
import clsx from "clsx";
import type { Property } from "@/lib/models/property";
import { whatsappLink } from "@/lib/site";
import { trackWhatsAppLeadAction } from "@/lib/actions/leads.actions";
import { recordWebsiteEventAction } from "@/lib/actions/analytics.actions";
import { trackEvent } from "@/lib/analytics";
import { getOrCreateSessionId } from "@/lib/session";
import { FavoriteButton } from "@/components/customer/FavoriteButton";
import { CompareCheckbox } from "@/components/customer/CompareCheckbox";
import { recordSearchEventAction } from "@/lib/actions/propertySearch.actions";

const statusBadgeStyle: Record<string, string> = {
  Reserved: "bg-ink/80 text-white",
  Sold: "bg-ink/80 text-white",
  Inactive: "bg-ink/80 text-white",
};

export function PropertyCard({
  property,
  selected,
  searchContext,
  onMouseEnter,
  onMouseLeave,
}: {
  property: Property;
  /** Highlights the card when its map marker is the active one (search
   *  results + map split view only). */
  selected?: boolean;
  /** When true, favorite/compare/view-details clicks also log a real
   *  search_events row — only meaningful on the /properties results
   *  grid, a no-op everywhere else this card is already used. */
  searchContext?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  function trackSearchClick(eventType: "favorite_from_search" | "compare_from_search" | "property_result_clicked") {
    if (!searchContext) return;
    recordSearchEventAction(eventType, { propertyId: property.id, sessionId: getOrCreateSessionId() });
  }

  return (
    <article
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={clsx(
        "group flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-sm transition-shadow hover:shadow-xl hover:shadow-ink/10",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border"
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={property.images[0]}
          alt={`${property.title} — ${property.size} ${property.type} in ${property.location}`}
          fill
          sizes="(min-width: 1024px) 380px, 90vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
            {property.type}
          </span>
          <span className="rounded-full bg-ink/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">
            {property.purpose}
          </span>
        </div>
        <div onClickCapture={() => trackSearchClick("favorite_from_search")} className="absolute right-3 top-3">
          <FavoriteButton propertyId={property.id} />
        </div>
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
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <Ruler className="h-4 w-4 shrink-0 text-primary" />
            {property.size}
          </span>
          {property.bedrooms !== undefined && (
            <span className="flex items-center gap-1.5">
              <BedDouble className="h-4 w-4 shrink-0 text-primary" />
              {property.bedrooms}
            </span>
          )}
          {property.bathrooms !== undefined && (
            <span className="flex items-center gap-1.5">
              <Bath className="h-4 w-4 shrink-0 text-primary" />
              {property.bathrooms}
            </span>
          )}
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

        <div className="mt-4 flex items-center gap-2.5">
          <div onClickCapture={() => trackSearchClick("compare_from_search")}>
            <CompareCheckbox propertyId={property.id} iconOnly />
          </div>
          <Link
            href={`/properties/${property.slug}`}
            onClick={() => trackSearchClick("property_result_clicked")}
            className="flex flex-1 items-center justify-center rounded-full border-2 border-ink/15 px-3 py-2.5 text-xs font-bold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            View Details
          </Link>
          <a
            href={whatsappLink(
              `Assalam-o-Alaikum 5STAR.M Estate & Builders,\n\nI am interested in:\n\nProperty: ${property.title}\nLocation: ${property.location}\nSize: ${property.size}\n\nPlease share the complete details, price and payment plan.\n\nThank you.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              trackWhatsAppLeadAction(property.title, property.id);
              trackEvent("whatsapp_click", { context: "property_card", property_id: property.id });
              recordWebsiteEventAction("whatsapp_click", { propertyId: property.id, sessionId: getOrCreateSessionId() });
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-success px-3 py-2.5 text-xs font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Inquiry
          </a>
        </div>
      </div>
    </article>
  );
}
