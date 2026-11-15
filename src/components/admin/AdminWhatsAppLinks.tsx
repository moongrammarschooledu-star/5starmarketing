"use client";

import { useEffect } from "react";
import { openAdminWhatsApp, shouldTakeOver } from "@/lib/adminWhatsApp";

/** Mounted once in the admin panel: every WhatsApp link there opens in WhatsApp Web, in one reused tab.
 *  The links' own click handlers (activity logging, "sent" ticks) still run - only the navigation is replaced. */
export function AdminWhatsAppLinks() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = shouldTakeOver(e);
      if (!a) return;
      e.preventDefault();
      openAdminWhatsApp(a.href);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
