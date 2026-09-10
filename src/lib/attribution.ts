import type { AttributionTouch } from "./models/campaign";

const FIRST_TOUCH_KEY = "5starm_first_touch";
const LAST_TOUCH_KEY = "5starm_last_touch";
const DEFAULT_ATTRIBUTION_WINDOW_DAYS = 30;

interface StoredTouch extends AttributionTouch {
  capturedAt: string; // ISO
}

function readTouch(key: string): StoredTouch | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as StoredTouch;
  } catch {
    return null;
  }
}

function writeTouch(key: string, touch: StoredTouch): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(touch));
  } catch {
    // best-effort — private browsing / blocked site data
  }
}

function isExpired(touch: StoredTouch, windowDays: number): boolean {
  return Date.now() - new Date(touch.capturedAt).getTime() > windowDays * 24 * 60 * 60 * 1000;
}

/** Reads utm_* params from the current URL and updates first/last-touch
 *  attribution in localStorage. No-ops when the URL has no utm_source,
 *  utm_medium or utm_campaign — an organic page view never overwrites an
 *  existing campaign touch. First-touch is set once and left alone
 *  unless it has expired past the configured attribution window;
 *  last-touch always reflects the most recent campaign-bearing visit. */
export function captureAttributionFromUrl(attributionWindowDays: number = DEFAULT_ATTRIBUTION_WINDOW_DAYS): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source") ?? undefined;
    const medium = params.get("utm_medium") ?? undefined;
    const campaign = params.get("utm_campaign") ?? undefined;
    if (!source && !medium && !campaign) return;

    const touch: StoredTouch = {
      source,
      medium,
      campaign,
      content: params.get("utm_content") ?? undefined,
      term: params.get("utm_term") ?? undefined,
      landingPage: window.location.pathname,
      capturedAt: new Date().toISOString(),
    };

    const existingFirst = readTouch(FIRST_TOUCH_KEY);
    if (!existingFirst || isExpired(existingFirst, attributionWindowDays)) {
      writeTouch(FIRST_TOUCH_KEY, touch);
    }
    writeTouch(LAST_TOUCH_KEY, touch);
  } catch {
    // attribution capture must never break the page it runs on
  }
}

/** Read back whatever attribution is on file — for inquiry forms to
 *  attach to their submission, and for WhatsApp/phone click tracking. */
export function getAttribution(): { firstTouch: AttributionTouch | null; lastTouch: AttributionTouch | null } {
  return { firstTouch: readTouch(FIRST_TOUCH_KEY), lastTouch: readTouch(LAST_TOUCH_KEY) };
}

/** Flat payload shape ready to spread into a lead-creation request body. */
export function getAttributionPayload(): Record<string, string | undefined> {
  const { firstTouch, lastTouch } = getAttribution();
  return {
    firstTouchSource: firstTouch?.source,
    firstTouchMedium: firstTouch?.medium,
    firstTouchCampaign: firstTouch?.campaign,
    firstTouchContent: firstTouch?.content,
    firstTouchTerm: firstTouch?.term,
    firstTouchLandingPage: firstTouch?.landingPage,
    lastTouchSource: lastTouch?.source,
    lastTouchMedium: lastTouch?.medium,
    lastTouchCampaign: lastTouch?.campaign,
    lastTouchContent: lastTouch?.content,
    lastTouchTerm: lastTouch?.term,
    lastTouchLandingPage: lastTouch?.landingPage,
  };
}
