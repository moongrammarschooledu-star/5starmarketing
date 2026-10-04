"use client";

import { useCallback, useState, type ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { whatsappLink, whatsappUrlFor } from "@/lib/site";
import { trackWhatsAppLeadAction } from "@/lib/actions/leads.actions";
import { recordWebsiteEventAction } from "@/lib/actions/analytics.actions";
import { trackEvent } from "@/lib/analytics";
import { getOrCreateSessionId } from "@/lib/session";
import { ContactDialog } from "./ContactDialog";

/** A WhatsApp inquiry button that first asks for the visitor's name and
 *  number (WhatsApp's own link never reveals who is writing), saves them as
 *  a lead, then opens WhatsApp with that info already in the message. */
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
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  function proceed({ name, phone }: { name: string; phone: string }) {
    const full = `${message}\n\nMy name: ${name}\nMy number: ${phone}`;
    const url = whatsappNumber ? whatsappUrlFor(whatsappNumber, full) : whatsappLink(full);
    // Opened straight from the click so the browser's pop-up blocker allows it.
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);

    void trackWhatsAppLeadAction({ name, phone, propertyTitle, propertyId });
    trackEvent("whatsapp_click", { context, property_id: propertyId });
    void recordWebsiteEventAction("whatsapp_click", { propertyId, sessionId: getOrCreateSessionId() });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <ContactDialog
        open={open}
        onClose={close}
        title="Chat with us on WhatsApp"
        description="So our team can reach you back, please share your name and number."
        submitLabel="Continue to WhatsApp"
        submitIcon={<MessageCircle className="h-4 w-4" />}
        submitClassName="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
        onSubmit={proceed}
      />
    </>
  );
}
