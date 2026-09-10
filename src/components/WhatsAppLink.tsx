"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";
import { getOrCreateSessionId } from "@/lib/session";
import { recordWebsiteEventAction } from "@/lib/actions/analytics.actions";
import { recordCampaignEventAction } from "@/lib/actions/marketing.actions";
import { getAttribution } from "@/lib/attribution";

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
        const sessionId = getOrCreateSessionId();
        if (propertyId || projectId) {
          recordWebsiteEventAction("whatsapp_click", { propertyId, projectId, sessionId });
        }
        const { lastTouch } = getAttribution();
        recordCampaignEventAction("whatsapp_click", {
          propertyId,
          projectId,
          sessionId,
          utmSource: lastTouch?.source,
          utmMedium: lastTouch?.medium,
          utmCampaign: lastTouch?.campaign,
          utmContent: lastTouch?.content,
          utmTerm: lastTouch?.term,
        });
      }}
      className={className}
    >
      {children}
    </a>
  );
}
