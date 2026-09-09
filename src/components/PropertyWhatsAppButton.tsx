"use client";

import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/site";
import { trackWhatsAppLeadAction } from "@/lib/actions/leads.actions";

export function PropertyWhatsAppButton({
  propertyId,
  propertyTitle,
  message,
}: {
  propertyId: string;
  propertyTitle: string;
  message: string;
}) {
  return (
    <a
      href={whatsappLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackWhatsAppLeadAction(propertyTitle, propertyId)}
      className="flex items-center justify-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
    >
      <MessageCircle className="h-4 w-4" /> WhatsApp
    </a>
  );
}
