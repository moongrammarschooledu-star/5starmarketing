"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { registerPushSubscriptionAction, unregisterPushSubscriptionAction } from "@/lib/actions/mobile.actions";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return buffer;
}

/** Real device registration/removal (STEP 31 section 25) — not a
 *  cosmetic toggle. Clearly discloses when push isn't available at all
 *  (no VAPID key configured, or the browser doesn't support it) rather
 *  than showing a switch that silently does nothing. */
export function PushSubscribeToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidKey) return;
    setSupported(true);
    navigator.serviceWorker.ready.then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setSubscribed(!!existing);
    });
  }, [vapidKey]);

  async function subscribe() {
    if (!vapidKey) return;
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = subscription.toJSON();
      await registerPushSubscriptionAction(
        { endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth } },
        undefined,
        navigator.userAgent
      );
      setSubscribed(true);
    } catch {
      setError("Could not enable notifications — check your browser's notification permission.");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unregisterPushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      setError("Could not disable notifications on this device.");
    } finally {
      setBusy(false);
    }
  }

  if (!vapidKey) {
    return (
      <p className="text-xs text-muted">
        Push notifications aren&apos;t configured on this site yet — an administrator needs to set up a VAPID key.
      </p>
    );
  }

  if (!supported) {
    return <p className="text-xs text-muted">This browser doesn&apos;t support push notifications.</p>;
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={subscribed ? unsubscribe : subscribe}
        className="flex items-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-xs font-bold text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
      >
        {subscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {subscribed ? "Turn off notifications on this device" : "Enable notifications on this device"}
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
