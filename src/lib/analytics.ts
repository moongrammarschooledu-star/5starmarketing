// Thin wrapper around gtag.js. Every call is a no-op when Google
// Analytics isn't configured (NEXT_PUBLIC_GA_ID unset) or when running
// server-side, so components can call trackEvent() unconditionally
// without checking configuration themselves. Never pass personal data
// (names, phone numbers, emails, message contents) as event params —
// only the minimal context needed to see which page/property/channel an
// action happened on.

export type AnalyticsEvent =
  | "property_view"
  | "property_inquiry"
  | "contact_form_submit"
  | "whatsapp_click"
  | "phone_click"
  | "project_inquiry"
  | "callback_request"
  | "investment_consultation_request"
  | "brochure_download"
  | "landing_page_inquiry";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

// Meta Pixel standard events, so ads can optimise for real enquiries.
// Lead = a form was sent; Contact = WhatsApp/phone tapped;
// ViewContent = a property page was opened.
const META_EVENTS: Record<AnalyticsEvent, string | null> = {
  property_view: "ViewContent",
  property_inquiry: "Lead",
  contact_form_submit: "Lead",
  project_inquiry: "Lead",
  callback_request: "Lead",
  investment_consultation_request: "Lead",
  landing_page_inquiry: "Lead",
  whatsapp_click: "Contact",
  phone_click: "Contact",
  brochure_download: null,
};

export function trackEvent(event: AnalyticsEvent, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;

  if (typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }

  if (typeof window.fbq === "function") {
    const metaEvent = META_EVENTS[event];
    if (metaEvent) {
      window.fbq("track", metaEvent, { content_name: event });
    } else {
      window.fbq("trackCustom", event);
    }
  }
}
