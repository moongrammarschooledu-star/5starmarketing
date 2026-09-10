const KEY = "5starm_recent_searches";
const MAX_ENTRIES = 6;

/** Guest recent-search keywords (section 38) — plain browser
 *  localStorage, never sent anywhere, never anything beyond the search
 *  text itself (no personal data). Logged-in customers get the richer,
 *  persistent "Saved Search" feature instead (STEP 10, extended in
 *  STEP 16) rather than a second, overlapping recent-searches store. */
export function getRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    const existing = getRecentSearches().filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
    const next = [trimmed, ...existing].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // best-effort — private browsing / blocked site data
  }
}

export function clearRecentSearches(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
