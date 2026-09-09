"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { getOrCreateSessionId } from "@/lib/session";
import { recordPropertyViewAction } from "@/lib/actions/analytics.actions";

/** Fires a `property_view` analytics event once per page load — kept as
 *  its own tiny client component so the property detail page itself can
 *  stay a Server Component. Only non-personal context is sent. */
export function PropertyViewTracker({ propertyId, propertyType, locationArea }: { propertyId: string; propertyType: string; locationArea: string }) {
  useEffect(() => {
    trackEvent("property_view", { property_id: propertyId, property_type: propertyType, location: locationArea });
    recordPropertyViewAction(propertyId, getOrCreateSessionId());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  return null;
}
