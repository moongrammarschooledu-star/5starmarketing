"use server";

import { analyticsService } from "@/services/analyticsService";

// Callable from anonymous visitors (public pages) — every method here is
// best-effort and never throws back to the caller, so a tracking failure
// can never break the page it's attached to.

export async function recordPropertyViewAction(propertyId: string, sessionId?: string) {
  await analyticsService.recordPropertyView(propertyId, sessionId);
}

export async function recordWebsiteEventAction(
  eventType: "whatsapp_click" | "phone_click" | "contact_form_submit" | "project_view",
  opts: { propertyId?: string; projectId?: string; sessionId?: string }
) {
  await analyticsService.recordEvent(eventType, opts);
}
