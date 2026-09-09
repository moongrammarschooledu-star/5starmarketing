"use client";

import { MessageCircle } from "lucide-react";
import { whatsappLink, whatsappUrlFor } from "@/lib/site";
import { trackWhatsAppLeadAction } from "@/lib/actions/leads.actions";
import { recordWebsiteEventAction } from "@/lib/actions/analytics.actions";
import { trackEvent } from "@/lib/analytics";
import { getOrCreateSessionId } from "@/lib/session";

export function PropertyWhatsAppButton({
  propertyId,
  propertyTitle,
  message,
  whatsappNumber,
}: {
  propertyId: string;
  propertyTitle: string;
  message: string;
  whatsappNumber?: string;
}) {
  return (
    <a
      href={whatsappNumber ? whatsappUrlFor(whatsappNumber, message) : whatsappLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        trackWhatsAppLeadAction(propertyTitle, propertyId);
        trackEvent("whatsapp_click", { context: "property_detail", property_id: propertyId });
        recordWebsiteEventAction("whatsapp_click", { propertyId, sessionId: getOrCreateSessionId() });
      }}
      className="flex items-center justify-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
    >
      <MessageCircle className="h-4 w-4" /> WhatsApp
    </a>
  );
}
