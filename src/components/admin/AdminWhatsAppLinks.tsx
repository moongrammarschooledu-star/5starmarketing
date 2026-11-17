"use client";

import { useEffect } from "react";
import { openAdminWhatsApp, shouldTakeOver } from "@/lib/adminWhatsApp";

/** Mounted once in the admin panel: every WhatsApp link there opens straight in the installed WhatsApp app
 *  (Shift + click = WhatsApp Web in one reused tab). The links' own click handlers (activity logging,
 *  "sent" ticks) still run - only the navigation is replaced. */
export function AdminWhatsAppLinks() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const hit = shouldTakeOver(e);
      if (!hit) return;
      e.preventDefault();
      openAdminWhatsApp(hit.anchor.href, { web: hit.web });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
