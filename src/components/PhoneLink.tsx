"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";
import { getOrCreateSessionId } from "@/lib/session";
import { recordWebsiteEventAction } from "@/lib/actions/analytics.actions";

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
        if (propertyId || projectId) {
          recordWebsiteEventAction("phone_click", { propertyId, projectId, sessionId: getOrCreateSessionId() });
        }
      }}
      className={className}
    >
      {children}
    </a>
  );
}
