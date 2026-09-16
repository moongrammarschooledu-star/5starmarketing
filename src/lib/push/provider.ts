import "server-only";
import webpush from "web-push";
import { pushSubscriptionService } from "@/services/pushSubscriptionService";
import { mobilePreferencesService } from "@/services/mobilePreferencesService";
import type { MobileActorType, NotificationCategory, PushPayload } from "@/lib/models/mobile";

/** Real Web Push (VAPID) — works for Android/desktop Chrome/Firefox/Edge
 *  directly, and for iOS Safari once the site is installed as a PWA
 *  (iOS 16.4+). This is the one push technology that's genuinely
 *  provider-agnostic across all three platforms the spec asks for —
 *  there's no separate "Android push"/"iOS push" implementation to add
 *  on top, since neither platform's own push service (FCM/APNs) applies
 *  to a web app that isn't compiled as a native binary.
 *
 *  Follows the same honest "not configured" pattern as
 *  src/lib/ai/provider.ts and src/lib/marketing/providers.ts — with no
 *  VAPID keys set, every send is silently skipped rather than faking a
 *  delivery. */
export function isPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function ensureConfigured(): boolean {
  if (!isPushConfigured()) return false;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@5starm.com",
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    configured = true;
  }
  return true;
}

/** Sends a push to every device the given actor has registered, best
 *  effort — never throws, never blocks the caller. Respects the
 *  actor's own mobile_app_preferences category toggle. Expired
 *  subscriptions (410 Gone / 404) are pruned automatically. */
export async function sendPushToActor(
  actorType: MobileActorType,
  actorId: string,
  category: NotificationCategory,
  payload: PushPayload
): Promise<void> {
  if (!ensureConfigured()) return;
  try {
    const enabled = await mobilePreferencesService.categoryEnabled(actorType, actorId, category);
    if (!enabled) return;

    const subscriptions = await pushSubscriptionService.listForActor(actorId);
    if (subscriptions.length === 0) return;

    const body = JSON.stringify(payload);
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.authKey } },
            body
          );
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await pushSubscriptionService.removeByEndpoint(sub.endpoint).catch(() => {});
          } else {
            console.error("sendPushToActor: delivery failed for one subscription:", e);
          }
        }
      })
    );
  } catch (e) {
    console.error("sendPushToActor failed:", e);
  }
}
