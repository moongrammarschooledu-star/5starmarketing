"use client";

import { useEffect } from "react";
import { getOrCreateSessionId } from "@/lib/session";
import { recordWebsiteEventAction } from "@/lib/actions/analytics.actions";

/** Fires a `project_view` analytics event once per page load — the
 *  project-detail analog of PropertyViewTracker. */
export function ProjectViewTracker({ projectId }: { projectId: string }) {
  useEffect(() => {
    recordWebsiteEventAction("project_view", { projectId, sessionId: getOrCreateSessionId() });
  }, [projectId]);

  return null;
}
