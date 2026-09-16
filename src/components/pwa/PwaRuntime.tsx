"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { logPwaInstallEventAction } from "@/lib/actions/mobile.actions";

const DISMISS_KEY = "5starm-pwa-install-dismissed-at";
const DISMISS_COOLDOWN_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function recentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;
  return Date.now() - dismissedAt < DISMISS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
}

/** Mounted once in the root layout. Handles three independent,
 *  non-native-app-pretending concerns (STEP 31 sections 3/4/26/42):
 *   1. Registers the service worker.
 *   2. Shows "New version available" when a new SW finishes installing.
 *   3. Shows an install banner (real beforeinstallprompt on
 *      Android/desktop Chrome/Edge; manual instructions on iOS Safari,
 *      which never fires that event) — dismissed once, stays dismissed
 *      for 14 days, never shown again once actually installed. */
export function PwaRuntime() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [updateWaiting, setUpdateWaiting] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          setUpdateWaiting(registration.waiting);
        }
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateWaiting(newWorker);
            }
          });
        });
      })
      .catch(() => {});

    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }, []);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    function handler(e: Event) {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      logPwaInstallEventAction("PROMPT_SHOWN", "android/desktop").catch(() => {});
    }
    window.addEventListener("beforeinstallprompt", handler as EventListener);

    if (isIos()) {
      setShowIosHint(true);
      logPwaInstallEventAction("PROMPT_SHOWN", "ios").catch(() => {});
    }

    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  function dismissInstall() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    logPwaInstallEventAction("DISMISSED", isIos() ? "ios" : "android/desktop").catch(() => {});
    setInstallPrompt(null);
    setShowIosHint(false);
    setDismissed(true);
  }

  async function doInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    logPwaInstallEventAction(choice.outcome === "accepted" ? "INSTALLED" : "DISMISSED", "android/desktop").catch(() => {});
    if (choice.outcome !== "accepted") localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setInstallPrompt(null);
  }

  function applyUpdate() {
    updateWaiting?.postMessage("SKIP_WAITING");
    setUpdateWaiting(null);
  }

  const showInstallBanner = !dismissed && (installPrompt || showIosHint);

  return (
    <>
      {updateWaiting && (
        <div className="fixed inset-x-0 top-0 z-[70] flex items-center justify-between gap-3 bg-ink px-4 py-2.5 text-sm text-white">
          <span className="flex items-center gap-2 font-semibold">
            <RefreshCw className="h-4 w-4" /> New version available
          </span>
          <button
            type="button"
            onClick={applyUpdate}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground"
          >
            Update Now
          </button>
        </div>
      )}

      {showInstallBanner && (
        <div className="fixed inset-x-3 bottom-20 z-[65] mx-auto max-w-md rounded-2xl border border-border bg-surface p-4 shadow-xl lg:bottom-6">
          <button
            type="button"
            onClick={dismissInstall}
            aria-label="Dismiss"
            className="absolute right-3 top-3 text-muted hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <p className="font-heading text-sm font-bold text-ink">Install 5STAR.M App</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Faster access, an app-like experience, notifications and quick property search — right from your
                home screen.
              </p>
              {showIosHint && !installPrompt ? (
                <p className="mt-2 text-xs font-semibold text-ink">
                  Tap the Share icon, then &quot;Add to Home Screen&quot;.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={doInstall}
                  className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                >
                  Install
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
