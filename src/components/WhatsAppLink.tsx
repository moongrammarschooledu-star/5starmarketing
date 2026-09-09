"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";
import { getOrCreateSessionId } from "@/lib/session";
import { recordWebsiteEventAction } from "@/lib/actions/analytics.actions";

/** A WhatsApp link that fires a `whatsapp_click` analytics event — a
 *  small client wrapper so the Server Component pages that use it don't
 *  need to become client components themselves. */
export function WhatsAppLink({
  href,
  context,
  propertyId,
  projectId,
  className,
  children,
}: {
  href: string;
  context: string;
  propertyId?: string;
  projectId?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        trackEvent("whatsapp_click", { context });
        if (propertyId || projectId) {
          recordWebsiteEventAction("whatsapp_click", { propertyId, projectId, sessionId: getOrCreateSessionId() });
        }
      }}
      className={className}
    >
      {children}
    </a>
  );
}
