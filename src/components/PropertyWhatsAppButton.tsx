"use client";

import { MessageCircle } from "lucide-react";
import { WhatsAppInquiryButton } from "./WhatsAppInquiryButton";

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
    <WhatsAppInquiryButton
      propertyId={propertyId}
      propertyTitle={propertyTitle}
      message={message}
      whatsappNumber={whatsappNumber}
      context="property_detail"
      className="flex items-center justify-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
    >
      <MessageCircle className="h-4 w-4" /> WhatsApp
    </WhatsAppInquiryButton>
  );
}
