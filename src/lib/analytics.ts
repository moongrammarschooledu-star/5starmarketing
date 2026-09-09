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
  | "phone_click";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(event: AnalyticsEvent, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", event, params);
}
