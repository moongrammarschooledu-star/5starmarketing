"use client";

import { useEffect } from "react";
import { getOrCreateSessionId } from "@/lib/session";
import { recordWebsiteEventAction } from "@/lib/actions/analytics.actions";
import { recordCampaignEventAction } from "@/lib/actions/marketing.actions";
import { getAttribution } from "@/lib/attribution";

/** Fires a `project_view` analytics event once per page load — the
 *  project-detail analog of PropertyViewTracker. */
export function ProjectViewTracker({ projectId }: { projectId: string }) {
  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    recordWebsiteEventAction("project_view", { projectId, sessionId });
    const { lastTouch } = getAttribution();
    if (lastTouch) {
      recordCampaignEventAction("project_view", {
        projectId,
        sessionId,
        utmSource: lastTouch.source,
        utmMedium: lastTouch.medium,
        utmCampaign: lastTouch.campaign,
        utmContent: lastTouch.content,
        utmTerm: lastTouch.term,
      });
    }
  }, [projectId]);

  return null;
}
