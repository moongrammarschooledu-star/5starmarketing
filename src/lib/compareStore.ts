// Property comparison is intentionally NOT persisted server-side (STEP 10
// section 6: "do not create unnecessary database records") — it's a
// short-lived browsing aid, so plain localStorage is the right amount of
// permanence. Works for both logged-in customers and anonymous visitors.
const KEY = "5starm_compare_ids";
export const MAX_COMPARE = 4;

export function getCompareIds(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function setCompareIds(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent("compare-changed", { detail: ids }));
  } catch {
    // Private browsing / blocked storage — comparison just won't persist
    // across a reload, which is an acceptable degradation.
  }
}

/** Returns the new list, or null if already at MAX_COMPARE and id isn't
 *  already in it. */
export function addToCompare(id: string): string[] | null {
  const current = getCompareIds();
  if (current.includes(id)) return current;
  if (current.length >= MAX_COMPARE) return null;
  const next = [...current, id];
  setCompareIds(next);
  return next;
}

export function removeFromCompare(id: string): string[] {
  const next = getCompareIds().filter((v) => v !== id);
  setCompareIds(next);
  return next;
}

export function clearCompare() {
  setCompareIds([]);
}
