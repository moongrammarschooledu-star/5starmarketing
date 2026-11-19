"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/site";
import { trackEvent } from "@/lib/analytics";

// A single property page has a bar fixed to the bottom of the phone screen
// (WhatsApp / Call / Visit). The round button must sit above it, not on top of it.
const PROPERTY_LISTS = "for-sale|for-rent|houses|flats|commercial";
const SINGLE_PROPERTY = new RegExp(`^/properties/(?!(?:${PROPERTY_LISTS})/?$)[^/]+/?$`);

export function WhatsAppFloatButton() {
  const pathname = usePathname() ?? "";
  const aboveMobileBar = SINGLE_PROPERTY.test(pathname);
  // Campaign landing pages have their own WhatsApp / Call bar at the bottom.
  if (pathname.startsWith("/landing/")) return null;

  return (
    <a
      href={whatsappLink(
        "Hi 5STAR.M, I'm interested in your properties. Please share more details."
      )}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      data-ga-tracked="1"
      onClick={() => trackEvent("whatsapp_click", { context: "floating_button" })}
      className={`fixed right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-success shadow-lg shadow-black/20 transition-transform hover:scale-110 sm:right-6 ${
        aboveMobileBar ? "bottom-24 lg:bottom-6" : "bottom-5 sm:bottom-6"
      }`}
    >
      <MessageCircle className="h-7 w-7 text-white" fill="white" strokeWidth={0} />
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-success/60" />
    </a>
  );
}
