"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { getOrCreateSessionId } from "@/lib/session";
import { recordWebsiteEventAction } from "@/lib/actions/analytics.actions";

// Counts every tap on a WhatsApp or call link anywhere on the public site
// (Navbar, Hero, Footer, Contact, the mobile bar...), so the "WhatsApp clicks" and
// "Phone clicks" numbers in the admin are honest. Links that already count
// themselves say so with data attributes:
//   data-ga-tracked    - already sent to Google / Meta / TikTok
//   data-event-tracked - already saved in the admin's analytics
// Nothing personal is recorded: only that a click happened, and an anonymous session id.

export function ContactClickTracker() {
  useEffect(() => {
    let lastType = "";
    let lastAt = 0;

    function onClick(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const a = target.closest("a");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      const type = href.startsWith("tel:") ? "phone_click" : /^https:\/\/wa\.me\//.test(href) ? "whatsapp_click" : null;
      if (!type) return;

      // The same tap can reach this twice (capture + a parent link); count it once.
      const now = Date.now();
      if (type === lastType && now - lastAt < 1500) return;
      lastType = type;
      lastAt = now;

      if (!a.hasAttribute("data-ga-tracked")) trackEvent(type, { context: "site_link" });
      if (!a.hasAttribute("data-event-tracked")) void recordWebsiteEventAction(type, { sessionId: getOrCreateSessionId() });
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
