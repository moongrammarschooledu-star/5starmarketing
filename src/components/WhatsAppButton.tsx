"use client";

import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/site";
import { trackEvent } from "@/lib/analytics";

export function WhatsAppFloatButton() {
  return (
    <a
      href={whatsappLink(
        "Hi 5STAR.M, I'm interested in your properties. Please share more details."
      )}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      onClick={() => trackEvent("whatsapp_click", { context: "floating_button" })}
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-success shadow-lg shadow-black/20 transition-transform hover:scale-110 sm:bottom-6 sm:right-6"
    >
      <MessageCircle className="h-7 w-7 text-white" fill="white" strokeWidth={0} />
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-success/60" />
    </a>
  );
}
