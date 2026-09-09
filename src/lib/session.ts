const KEY = "5starm_session_id";

/** A random, non-identifying id used only to de-duplicate/rank analytics
 *  (e.g. "views" on a property) — never a name, phone, email or IP. Falls
 *  back to a fresh in-memory id if localStorage is unavailable (private
 *  browsing, blocked site data). */
export function getOrCreateSessionId(): string {
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}
