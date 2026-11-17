"use client";

import { type ReactNode } from "react";
import { whatsappLink, whatsappUrlFor } from "@/lib/site";
import { trackWhatsAppLeadAction } from "@/lib/actions/leads.actions";
import { recordWebsiteEventAction } from "@/lib/actions/analytics.actions";
import { trackEvent } from "@/lib/analytics";
import { getOrCreateSessionId } from "@/lib/session";
import { readSavedContact } from "./ContactDialog";

/** A WhatsApp inquiry button for a property. One tap opens WhatsApp with the
 *  property's details already written - nobody is asked for a name or number
 *  first, because every extra step loses people who just wanted to chat.
 *  The click is always counted. If this visitor has already left their name and
 *  number on this device (a form or brochure earlier), they are added to the
 *  message and saved as a lead with contact details, as before. */
export function WhatsAppInquiryButton({
  propertyId,
  propertyTitle,
  message,
  whatsappNumber,
  context,
  className,
  children,
}: {
  propertyId: string;
  propertyTitle: string;
  message: string;
  whatsappNumber?: string;
  context: string;
  className: string;
  children: ReactNode;
}) {
  function open() {
    const saved = readSavedContact();
    const full = saved ? `${message}\n\nMy name: ${saved.name}\nMy number: ${saved.phone}` : message;
    const url = whatsappNumber ? whatsappUrlFor(whatsappNumber, full) : whatsappLink(full);
    // Opened straight from the click so the browser's pop-up blocker allows it.
    window.open(url, "_blank", "noopener,noreferrer");

    if (saved) void trackWhatsAppLeadAction({ name: saved.name, phone: saved.phone, propertyTitle, propertyId });
    trackEvent("whatsapp_click", { context, property_id: propertyId });
    void recordWebsiteEventAction("whatsapp_click", { propertyId, sessionId: getOrCreateSessionId() });
  }

  return (
    <button type="button" onClick={open} className={className}>
      {children}
    </button>
  );
}
