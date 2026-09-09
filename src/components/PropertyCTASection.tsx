"use client";

import Link from "next/link";
import { Phone, MessageCircle, ClipboardList, CalendarClock } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { getOrCreateSessionId } from "@/lib/session";
import { recordWebsiteEventAction } from "@/lib/actions/analytics.actions";

export function PropertyCTASection({
  whatsappHref,
  callHref,
  inquiryAnchor = "#inquiry-form",
  bookVisitHref,
  propertyId,
}: {
  whatsappHref: string;
  callHref: string;
  inquiryAnchor?: string;
  bookVisitHref?: string;
  propertyId?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-ink p-6 text-center sm:p-8">
      <h2 className="font-heading text-xl font-extrabold text-white sm:text-2xl">
        Interested?
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-white/70">
        Contact 5STAR.M Estate & Builders for complete property details and consultation.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {bookVisitHref && (
          <Link
            href={bookVisitHref}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5"
          >
            <CalendarClock className="h-4 w-4" /> Schedule a Site Visit
          </Link>
        )}
        <a
          href={inquiryAnchor}
          className="flex items-center gap-2 rounded-full border-2 border-white/25 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-white/50"
        >
          <ClipboardList className="h-4 w-4" /> Request Property Details
        </a>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackEvent("whatsapp_click", { context: "cta_section" });
            if (propertyId) recordWebsiteEventAction("whatsapp_click", { propertyId, sessionId: getOrCreateSessionId() });
          }}
          className="flex items-center gap-2 rounded-full bg-success px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
        </a>
        <a
          href={callHref}
          onClick={() => {
            trackEvent("phone_click", { context: "cta_section" });
            if (propertyId) recordWebsiteEventAction("phone_click", { propertyId, sessionId: getOrCreateSessionId() });
          }}
          className="flex items-center gap-2 rounded-full border-2 border-white/25 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-white/50"
        >
          <Phone className="h-4 w-4" /> Call Now
        </a>
      </div>
    </div>
  );
}
