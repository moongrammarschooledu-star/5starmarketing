// What each social network accepts, so an ad made here can be posted anywhere
// without being turned away, plus a check of the ad's words for claims that
// platforms often reject. The numbers are common, deliberately cautious
// limits - the networks change their rules from time to time.

export type ShapeId = "vertical" | "portrait" | "square" | "wide" | "original";

export interface PlatformSpec {
  name: string;
  /** Shapes the network shows properly. */
  shapes: ShapeId[];
  maxSeconds: number;
  maxMB: number;
}

export const PLATFORMS: PlatformSpec[] = [
  { name: "Instagram Reels", shapes: ["vertical"], maxSeconds: 90, maxMB: 250 },
  { name: "Instagram Stories", shapes: ["vertical"], maxSeconds: 60, maxMB: 250 },
  { name: "Instagram feed", shapes: ["portrait", "square", "wide"], maxSeconds: 120, maxMB: 250 },
  { name: "Facebook Reels", shapes: ["vertical"], maxSeconds: 90, maxMB: 1000 },
  { name: "Facebook Stories", shapes: ["vertical"], maxSeconds: 60, maxMB: 1000 },
  { name: "Facebook feed", shapes: ["portrait", "square", "wide"], maxSeconds: 600, maxMB: 1000 },
  { name: "TikTok", shapes: ["vertical", "portrait", "square"], maxSeconds: 180, maxMB: 287 },
  { name: "YouTube Shorts", shapes: ["vertical", "square"], maxSeconds: 60, maxMB: 1000 },
  { name: "YouTube", shapes: ["wide"], maxSeconds: 3600, maxMB: 2000 },
  { name: "WhatsApp Status", shapes: ["vertical", "portrait", "square"], maxSeconds: 30, maxMB: 16 },
  { name: "LinkedIn", shapes: ["square", "wide", "portrait"], maxSeconds: 600, maxMB: 200 },
  { name: "X (Twitter)", shapes: ["square", "wide"], maxSeconds: 140, maxMB: 500 },
];

export interface Verdict {
  name: string;
  ok: boolean;
  /** Why it is not ok, or a gentle note when it is. */
  note?: string;
}

/** Checks a finished video against every network. */
export function checkVideoForPlatforms(v: { shape: ShapeId; seconds: number; bytes: number; isMp4: boolean }): Verdict[] {
  return PLATFORMS.map((p) => {
    if (!v.isMp4) return { name: p.name, ok: false, note: "needs an MP4 file" };
    if (v.shape === "original") return { name: p.name, ok: true, note: "check the video's shape" };
    if (!p.shapes.includes(v.shape)) return { name: p.name, ok: false, note: "different shape (it will show with black bars or be cropped)" };
    if (v.seconds > p.maxSeconds + 0.5) return { name: p.name, ok: false, note: `too long (limit about ${p.maxSeconds} seconds)` };
    if (v.bytes > p.maxMB * 1024 * 1024) return { name: p.name, ok: false, note: `file too big (limit about ${p.maxMB} MB)` };
    return { name: p.name, ok: true };
  });
}

export interface TextWarning {
  text: string;
  why: string;
}

const RISKY: { re: RegExp; why: string }[] = [
  { re: /\bguarantee(d|s)?\b/i, why: "Promising guaranteed results is often rejected." },
  { re: /\brisk[\s-]?free\b|\bno[\s-]risk\b|\bzero[\s-]risk\b/i, why: "Saying an investment has no risk is not allowed on most networks." },
  { re: /\b(double|triple|10x)\b.{0,25}\b(money|investment|profit|income)\b/i, why: "Promising to multiply money is treated as misleading." },
  { re: /\b\d{1,3}\s?%\s?(profit|return|roi|income)\b/i, why: "Fixed profit or return percentages are often rejected - leave them out." },
  { re: /\bget rich\b|\bquick money\b|\beasy money\b|\bovernight\b.{0,15}\b(rich|millionaire)\b/i, why: "Get-rich-quick wording is rejected." },
  { re: /\b(best|no\.?\s?1|number one|#1)\b.{0,20}\b(in pakistan|in lahore|in the world|ever)\b/i, why: "Claims like \"best in ...\" need proof; platforms may reject them." },
  { re: /\b(click here|tag (a )?friend|share (this )?to win|like and share)\b/i, why: "Asking people to click, tag or share to win is treated as engagement bait." },
  { re: /\b(100\s?%)\b/i, why: "\"100%\" claims are often questioned - use a precise fact instead." },
  { re: /\b(you are|are you)\b.{0,25}\b(poor|broke|in debt|unemployed|fat|single|divorced)\b/i, why: "Ads must not point at a person's personal situation." },
  { re: /گارنٹی|یقینی منافع|دگنا منافع|بغیر\s?رسک|رسک\s?فری/, why: "Guaranteed-profit wording (in Urdu) is often rejected." },
];

export function checkAdText(texts: string[]): TextWarning[] {
  const joined = texts.filter(Boolean).join("\n");
  if (!joined.trim()) return [];
  const out: TextWarning[] = [];
  for (const r of RISKY) {
    const m = joined.match(r.re);
    if (m) out.push({ text: m[0].trim(), why: r.why });
  }
  return out;
}

export const POSTING_TIPS: string[] = [
  "Use only pictures, videos and music you own or have the right to use. Songs in your own video can get it muted or blocked.",
  "Do not promise guaranteed profit or fixed returns, and do not copy another company's pictures or name.",
  "Keep the phone number, website and address true and the same as on your page.",
  "For paid Facebook / Instagram ads about property, choose the \"Housing\" special ad category if Meta asks for it.",
  "Keep important words away from the very top and bottom of a vertical video, where the app puts its own buttons.",
];
