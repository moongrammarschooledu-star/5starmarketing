"use server";

import { profileService } from "@/services/profileService";
import { customerService } from "@/services/customerService";
import { pushSubscriptionService } from "@/services/pushSubscriptionService";
import { mobilePreferencesService } from "@/services/mobilePreferencesService";
import { pwaAnalyticsService } from "@/services/pwaAnalyticsService";
import type {
  MobileActorType,
  MobileAppPreferences,
  MobileAppPreferencesInput,
  PushSubscriptionRecord,
  PwaInstallEventType,
  WebPushSubscriptionInput,
} from "@/lib/models/mobile";

async function resolveCurrentActor(): Promise<{ actorType: MobileActorType; actorId: string } | null> {
  const customer = await customerService.getCurrentCustomer();
  if (customer) return { actorType: "CUSTOMER", actorId: customer.id };
  const admin = await profileService.getCurrentAdmin();
  if (admin) return { actorType: "ADMIN", actorId: admin.id };
  return null;
}

export async function registerPushSubscriptionAction(
  subscription: WebPushSubscriptionInput,
  deviceLabel?: string,
  userAgent?: string
): Promise<void> {
  const actor = await resolveCurrentActor();
  if (!actor) throw new Error("You must be signed in to enable notifications.");
  await pushSubscriptionService.register(actor.actorType, actor.actorId, subscription, deviceLabel, userAgent);
}

export async function unregisterPushSubscriptionAction(endpoint: string): Promise<void> {
  await pushSubscriptionService.unregister(endpoint);
}

export async function listMyDevicesAction(): Promise<PushSubscriptionRecord[]> {
  const actor = await resolveCurrentActor();
  if (!actor) return [];
  return pushSubscriptionService.listForActor(actor.actorId);
}

/** Anonymous-safe — a visitor can install the PWA from the public site
 *  before ever logging in, so this never requires an actor. */
export async function logPwaInstallEventAction(
  eventType: PwaInstallEventType,
  platform?: string,
  userAgent?: string
): Promise<void> {
  const actor = await resolveCurrentActor();
  await pwaAnalyticsService.logEvent(eventType, actor ?? undefined, platform, userAgent);
}

export async function getMyMobilePreferencesAction(): Promise<MobileAppPreferences | null> {
  const actor = await resolveCurrentActor();
  if (!actor) return null;
  return mobilePreferencesService.get(actor.actorType, actor.actorId);
}

export async function updateMyMobilePreferencesAction(input: MobileAppPreferencesInput): Promise<MobileAppPreferences> {
  const actor = await resolveCurrentActor();
  if (!actor) throw new Error("You must be signed in to change preferences.");
  return mobilePreferencesService.update(actor.actorType, actor.actorId, input);
}
