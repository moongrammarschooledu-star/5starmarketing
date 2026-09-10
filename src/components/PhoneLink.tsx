"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";
import { getOrCreateSessionId } from "@/lib/session";
import { recordWebsiteEventAction } from "@/lib/actions/analytics.actions";
import { recordCampaignEventAction } from "@/lib/actions/marketing.actions";
import { getAttribution } from "@/lib/attribution";

/** A `tel:` link that fires a `phone_click` analytics event — a small
 *  client wrapper so the Server Component pages that use it don't need
 *  to become client components themselves. */
export function PhoneLink({
  phoneHref,
  context,
  propertyId,
  projectId,
  className,
  children,
}: {
  phoneHref: string;
  context: string;
  propertyId?: string;
  projectId?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={`tel:${phoneHref}`}
      onClick={() => {
        trackEvent("phone_click", { context });
        const sessionId = getOrCreateSessionId();
        if (propertyId || projectId) {
          recordWebsiteEventAction("phone_click", { propertyId, projectId, sessionId });
        }
        const { lastTouch } = getAttribution();
        recordCampaignEventAction("phone_click", {
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
