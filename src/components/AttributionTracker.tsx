"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureAttributionFromUrl } from "@/lib/attribution";
import { recordCampaignEventAction } from "@/lib/actions/marketing.actions";
import { getOrCreateSessionId } from "@/lib/session";

/** Mounted once at the site root. useSearchParams() requires a Suspense
 *  boundary or it opts every page under it out of static rendering —
 *  this wrapper supplies one so the rest of the (otherwise static) site
 *  is unaffected. */
export function AttributionTracker({ attributionWindowDays }: { attributionWindowDays: number }) {
  return (
    <Suspense fallback={null}>
      <AttributionTrackerInner attributionWindowDays={attributionWindowDays} />
    </Suspense>
  );
}

function AttributionTrackerInner({ attributionWindowDays }: { attributionWindowDays: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureAttributionFromUrl(attributionWindowDays);

    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");
    if (!utmSource && !utmMedium && !utmCampaign) return;

    recordCampaignEventAction("page_view", {
      sessionId: getOrCreateSessionId(),
      landingPage: pathname,
      utmSource: utmSource ?? undefined,
      utmMedium: utmMedium ?? undefined,
      utmCampaign: utmCampaign ?? undefined,
      utmContent: searchParams.get("utm_content") ?? undefined,
      utmTerm: searchParams.get("utm_term") ?? undefined,
    });
  }, [pathname, searchParams, attributionWindowDays]);

  return null;
}
