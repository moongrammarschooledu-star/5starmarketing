import type { NarrationLang } from "./narration";

// Limits and request reading for the admin "Ad Maker" (a company ad video made
// from pictures the admin uploads and a description the admin writes).

export const AD_LIMITS = {
  headline: 120,
  subline: 120,
  badge: 30,
  highlight: 60,
  descriptionMin: 20,
  descriptionMax: 1200,
  pictures: 8,
  pictureBytes: 12 * 1024 * 1024,
} as const;

export interface AdRequest {
  headline: string;
  subline: string;
  badge: string;
  highlight: string;
  description: string;
  lang?: NarrationLang;
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Reads the posted ad text, or says what is wrong with it. */
export function parseAdRequest(body: unknown): { ok: true; ad: AdRequest } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const headline = str(b.headline, AD_LIMITS.headline);
  const description = str(b.description, AD_LIMITS.descriptionMax);
  if (!headline) return { ok: false, error: "Please write a headline for the ad." };
  if (description.length < AD_LIMITS.descriptionMin) return { ok: false, error: "Please write a description (at least a couple of sentences) - the voice reads it." };
  return {
    ok: true,
    ad: {
      headline,
      description,
      subline: str(b.subline, AD_LIMITS.subline),
      badge: str(b.badge, AD_LIMITS.badge),
      highlight: str(b.highlight, AD_LIMITS.highlight),
      lang: b.lang === "en" || b.lang === "ur" ? b.lang : undefined,
    },
  };
}
