"use client";

/** Client-side offline draft queue (STEP 31 section 27). Deliberately
 *  NOT a server-side table — see the migration's design notes. A draft
 *  is only ever queued here while the browser is genuinely offline;
 *  once connectivity returns, it replays through the SAME authenticated
 *  server action any online user would call (re-validated by that
 *  action's own auth/RLS checks exactly as normal — nothing here
 *  bypasses authorization). localStorage is sufficient (not IndexedDB)
 *  since a queued item is always small plain text and there's at most
 *  one draft per key at a time. */

export function saveOfflineDraft(key: string, value: unknown) {
  try {
    localStorage.setItem(`5starm-offline-draft:${key}`, JSON.stringify(value));
  } catch {
    // localStorage can be unavailable (private browsing, quota) — the
    // draft is simply lost rather than the send silently failing later.
  }
}

export function readOfflineDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`5starm-offline-draft:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearOfflineDraft(key: string) {
  try {
    localStorage.removeItem(`5starm-offline-draft:${key}`);
  } catch {
    // Nothing to clean up if storage isn't available in the first place.
  }
}

/** Registers a one-shot retry when the browser regains connectivity.
 *  Returns an unsubscribe function. */
export function onReconnect(callback: () => void): () => void {
  window.addEventListener("online", callback);
  return () => window.removeEventListener("online", callback);
}
