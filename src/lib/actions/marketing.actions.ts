"use server";

import { revalidatePath } from "next/cache";
import { campaignService } from "@/services/campaignService";
import { marketingAnalyticsService } from "@/services/marketingAnalyticsService";
import { profileService } from "@/services/profileService";
import type { CampaignInput, CampaignStatus, MarketingEventType } from "@/lib/models/campaign";

// Callable from anonymous visitors — best-effort, never throws back to
// the caller, so a tracking failure can never break the page it's on.
export async function recordCampaignEventAction(
  eventType: MarketingEventType,
  opts: {
    propertyId?: string;
    projectId?: string;
    sessionId?: string;
    landingPage?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
  }
) {
  await marketingAnalyticsService.recordEvent(eventType, opts);
}

function revalidateAll(id?: string) {
  revalidatePath("/admin/marketing");
  revalidatePath("/admin/marketing/campaigns");
  revalidatePath("/admin/marketing/sources");
  revalidatePath("/admin/marketing/calendar");
  if (id) revalidatePath(`/admin/marketing/campaigns/${id}`);
}

export async function createCampaignAction(input: CampaignInput) {
  const admin = await profileService.getCurrentAdmin();
  const campaign = await campaignService.create(input, admin?.id);
  revalidateAll();
  return campaign;
}

export async function updateCampaignAction(id: string, input: Partial<CampaignInput>) {
  const campaign = await campaignService.update(id, input);
  revalidateAll(id);
  return campaign;
}

export async function setCampaignStatusAction(id: string, status: CampaignStatus) {
  await campaignService.setStatus(id, status);
  revalidateAll(id);
}

export async function deleteCampaignAction(id: string) {
  await campaignService.remove(id);
  revalidateAll();
}

/** Campaign Comparison (section 15) — performance + cost per lead for a
 *  handful of selected campaigns, fetched on demand from the client. */
export async function compareCampaignsAction(ids: string[]) {
  const results = await Promise.all(
    ids.map(async (id) => {
      const performance = await campaignService.performance(id);
      const cost = await campaignService.cost(id, performance);
      return { id, performance, cost };
    })
  );
  return results;
}
