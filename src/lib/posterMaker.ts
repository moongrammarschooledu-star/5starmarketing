import { site } from "./site";

// A general-purpose poster / picture ad, drawn on a <canvas> in the admin's
// browser (nothing is uploaded or stored on the server). The admin gives the
// text, up to four pictures, a colour scheme and a size, and downloads the
// result as PNG / JPG.

export type PosterSizeId = "square" | "portrait" | "story" | "landscape";

export const POSTER_SIZES: Record<PosterSizeId, { label: string; hint: string; w: number; h: number }> = {
  square: { label: "Square post", hint: "Works on every feed: Facebook, Instagram, LinkedIn, X", w: 1080, h: 1080 },
  portrait: { label: "Portrait post", hint: "Instagram and Facebook feed (best size)", w: 1080, h: 1350 },
  story: { label: "Story / Status", hint: "Stories, WhatsApp Status, reel cover, TikTok", w: 1080, h: 1920 },
  landscape: { label: "Banner", hint: "Facebook and LinkedIn link banner, YouTube, X", w: 1200, h: 628 },
};

export type PosterLayoutId = "classic" | "overlay" | "side";

export const POSTER_LAYOUTS: { id: PosterLayoutId; label: string; hint: string }[] = [
  { id: "classic", label: "Picture on top", hint: "Pictures above, details below" },
  { id: "overlay", label: "Full picture", hint: "Text written over the picture" },
  { id: "side", label: "Side by side", hint: "Text next to the pictures" },
];

export interface PosterColors {
  primary: string;
  background: string;
  text: string;
  accent: string;
}

export const POSTER_SCHEMES: { id: string; label: string; colors: PosterColors }[] = [
  { id: "brand", label: "5STAR Red", colors: { primary: "#D91E26", background: "#FFFFFF", text: "#14171C", accent: "#111111" } },
  { id: "gold", label: "Midnight Gold", colors: { primary: "#D4AF37", background: "#0B1B33", text: "#FFFFFF", accent: "#F3D98B" } },
  { id: "emerald", label: "Emerald", colors: { primary: "#0F7B5F", background: "#F4FBF8", text: "#0B2B22", accent: "#F2B632" } },
  { id: "royal", label: "Royal Purple", colors: { primary: "#6D28D9", background: "#FFFFFF", text: "#1E1B2E", accent: "#F59E0B" } },
  { id: "sunset", label: "Sunset Orange", colors: { primary: "#EA580C", background: "#FFF7ED", text: "#2B1608", accent: "#B91C1C" } },
  { id: "ocean", label: "Ocean Blue", colors: { primary: "#0369A1", background: "#F0F9FF", text: "#0C2233", accent: "#F97316" } },
  { id: "dark", label: "Black & Red", colors: { primary: "#E11D2A", background: "#111111", text: "#FFFFFF", accent: "#FACC15" } },
  { id: "mono", label: "Clean Grey", colors: { primary: "#334155", background: "#F8FAFC", text: "#0F172A", accent: "#0EA5E9" } },
];

export type PosterFontId = "modern" | "elegant" | "strong";

export const POSTER_FONTS: Record<PosterFontId, { label: string; family: string }> = {
  modern: { label: "Modern", family: `Arial, "Segoe UI", Helvetica, sans-serif` },
  elegant: { label: "Elegant", family: `Georgia, "Times New Roman", serif` },
  strong: { label: "Strong", family: `"Arial Black", Impact, Arial, sans-serif` },
};

export const POSTER_LIMITS = {
  badge: 24,
  headline: 90,
  subline: 140,
  details: 8,
  detailLength: 70,
  highlight: 40,
  cta: 70,
  extra: 90,
  pictures: 4,
  pictureBytes: 12 * 1024 * 1024,
} as const;

export interface PosterConfig {
  size: PosterSizeId;
  layout: PosterLayoutId;
  font: PosterFontId;
  colors: PosterColors;
  badge: string;
  headline: string;
  subline: string;
  /** One point per line. */
  details: string;
  highlight: string;
  cta: string;
  extra: string;
  showContact: boolean;
  showLogo: boolean;
  rounded: boolean;
  /** Story size only: keeps everything clear of the buttons the apps draw at the top and bottom. */
  safeZones: boolean;
}

export const POSTER_DEFAULTS: PosterConfig = {
  size: "square",
  layout: "classic",
  font: "modern",
  colors: POSTER_SCHEMES[0].colors,
  badge: "FOR SALE",
  headline: "5 Marla House in Johar Town",
  subline: "Prime location, ready to move in",
  details: "3 bedrooms with attached baths\nModern kitchen and lounge\nCorner plot on a 30 ft road",
  highlight: "PKR 2.5 Crore",
  cta: "Call today for a free site visit",
  extra: "",
  showContact: true,
  showLogo: true,
  rounded: false,
  safeZones: true,
};

type Img = CanvasImageSource;

// ---------------------------------------------------------------- colours

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Black or white, whichever reads better on `hex`. */
export function onColor(hex: string): string {
  return luminance(hex) > 0.45 ? "#111111" : "#FFFFFF";
}

export function withAlpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// ---------------------------------------------------------------- drawing helpers

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function dims(img: Img): { w: number; h: number } {
  const a = img as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number };
  return { w: a.naturalWidth || a.width || 1, h: a.naturalHeight || a.height || 1 };
}

function drawCover(ctx: CanvasRenderingContext2D, img: Img, x: number, y: number, w: number, h: number) {
  const { w: iw, h: ih } = dims(img);
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function collageRects(n: number, r: Rect, gap: number): Rect[] {
  const { x, y, w, h } = r;
  if (n <= 1) return [r];
  const halfW = (w - gap) / 2;
  const halfH = (h - gap) / 2;
  if (n === 2) {
    return w >= h * 0.8
      ? [{ x, y, w: halfW, h }, { x: x + halfW + gap, y, w: halfW, h }]
      : [{ x, y, w, h: halfH }, { x, y: y + halfH + gap, w, h: halfH }];
  }
  if (n === 3) {
    if (h > w * 1.15) {
      const bigH = (h - gap) * 0.6;
      const smallH = h - gap - bigH;
      return [{ x, y, w, h: bigH }, { x, y: y + bigH + gap, w: halfW, h: smallH }, { x: x + halfW + gap, y: y + bigH + gap, w: halfW, h: smallH }];
    }
    const bigW = (w - gap) * 0.6;
    const smallW = w - gap - bigW;
    return [{ x, y, w: bigW, h }, { x: x + bigW + gap, y, w: smallW, h: halfH }, { x: x + bigW + gap, y: y + halfH + gap, w: smallW, h: halfH }];
  }
  return [
    { x, y, w: halfW, h: halfH },
    { x: x + halfW + gap, y, w: halfW, h: halfH },
    { x, y: y + halfH + gap, w: halfW, h: halfH },
    { x: x + halfW + gap, y: y + halfH + gap, w: halfW, h: halfH },
  ];
}

function drawCollage(ctx: CanvasRenderingContext2D, imgs: Img[], r: Rect, gap: number, radius: number) {
  const rects = collageRects(imgs.length, r, gap);
  rects.forEach((rc, i) => {
    ctx.save();
    roundRect(ctx, rc.x, rc.y, rc.w, rc.h, radius);
    ctx.clip();
    drawCover(ctx, imgs[i], rc.x, rc.y, rc.w, rc.h);
    ctx.restore();
  });
}

/** Shown instead of pictures when none were added. */
function drawPlaceholder(ctx: CanvasRenderingContext2D, r: Rect, c: PosterColors, radius: number) {
  ctx.save();
  roundRect(ctx, r.x, r.y, r.w, r.h, radius);
  ctx.clip();
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  g.addColorStop(0, c.primary);
  g.addColorStop(1, c.accent);
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(r.x + r.w * 0.82, r.y + r.h * 0.22, Math.min(r.w, r.h) * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r.x + r.w * 0.12, r.y + r.h * 0.95, Math.min(r.w, r.h) * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- text

export const isRtl = (t: string) => /[֐-ࣿ]/.test(t);

export function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const t = `${line} ${words[i]}`;
      if (ctx.measureText(t).width <= maxW) line = t;
      else {
        out.push(line);
        line = words[i];
      }
    }
    out.push(line);
  }
  return out;
}

interface Block {
  kind: "text" | "bullet" | "pill";
  text: string;
  size: number;
  minSize: number;
  weight: "bold" | "normal";
  color: string;
  maxLines: number;
  gapAfter: number;
  bg?: string;
}

interface FlowStyle {
  family: string;
  bullet: string;
  bulletMark: string;
}

/** Lays the blocks out top to bottom inside `area`. When `draw` is false it
 *  only measures. Returns the height used. */
function flow(ctx: CanvasRenderingContext2D, blocks: Block[], area: Rect, st: FlowStyle, scale: number, draw: boolean, startY: number): number {
  let y = startY;
  for (const b of blocks) {
    let size = b.size * scale;
    const min = b.minSize * scale;
    const indent = b.kind === "bullet" ? size * 1.15 : 0;
    const pad = b.kind === "pill" ? size * 0.5 : 0;
    const maxW = area.w - indent - pad * 2;
    let lines: string[] = [];
    for (;;) {
      ctx.font = `${b.weight} ${Math.round(size)}px ${st.family}`;
      lines = wrap(ctx, b.text, maxW);
      if (lines.length <= b.maxLines || size <= min) break;
      size -= 2;
    }
    if (lines.length > b.maxLines) {
      lines = lines.slice(0, b.maxLines);
      lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[\s.,;:!-]+$/, "")}...`;
    }
    const lh = size * 1.2;
    const rtl = isRtl(b.text);
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textAlign = rtl ? "right" : "left";
    ctx.textBaseline = "alphabetic";

    if (b.kind === "pill") {
      const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const pw = widest + pad * 2;
      const ph = lines.length * lh + pad * 0.9;
      if (draw) {
        const px = rtl ? area.x + area.w - pw : area.x;
        ctx.fillStyle = b.bg ?? "#000";
        roundRect(ctx, px, y, pw, ph, ph * 0.28);
        ctx.fill();
        ctx.fillStyle = b.color;
        lines.forEach((l, i) => ctx.fillText(l, rtl ? px + pw - pad : px + pad, y + pad * 0.45 + lh * (i + 0.82)));
      }
      y += ph + b.gapAfter * scale;
      continue;
    }

    if (draw) {
      ctx.fillStyle = b.color;
      lines.forEach((l, i) => {
        const baseline = y + lh * (i + 0.82);
        if (b.kind === "bullet" && i === 0) {
          const r = size * 0.36;
          const cx = rtl ? area.x + area.w - r : area.x + r;
          const cy = baseline - size * 0.3;
          ctx.fillStyle = st.bullet;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = st.bulletMark;
          ctx.lineWidth = Math.max(2, size * 0.08);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(cx - r * 0.42, cy + r * 0.02);
          ctx.lineTo(cx - r * 0.1, cy + r * 0.34);
          ctx.lineTo(cx + r * 0.46, cy - r * 0.3);
          ctx.stroke();
          ctx.fillStyle = b.color;
        }
        const tx = rtl ? area.x + area.w - indent : area.x + indent;
        ctx.fillText(l, tx, baseline, maxW);
      });
    }
    y += lines.length * lh + b.gapAfter * scale;
  }
  return y - startY;
}

// ---------------------------------------------------------------- the poster

interface Palette {
  head: string;
  body: string;
  accentText: string;
  pillBg: string;
  pillText: string;
  bullet: string;
  bulletMark: string;
}

function makeBlocks(cfg: PosterConfig, p: Palette): Block[] {
  const blocks: Block[] = [];
  if (cfg.headline.trim())
    blocks.push({ kind: "text", text: cfg.headline.trim(), size: 86, minSize: 38, weight: "bold", color: p.head, maxLines: 3, gapAfter: 14 });
  if (cfg.subline.trim())
    blocks.push({ kind: "text", text: cfg.subline.trim(), size: 40, minSize: 22, weight: "normal", color: p.body, maxLines: 2, gapAfter: 24 });
  const details = cfg.details
    .split("\n")
    .map((d) => d.trim())
    .filter(Boolean)
    .slice(0, POSTER_LIMITS.details);
  details.forEach((d, i) =>
    blocks.push({ kind: "bullet", text: d, size: 38, minSize: 20, weight: "normal", color: p.body, maxLines: 2, gapAfter: i === details.length - 1 ? 26 : 12 }),
  );
  if (cfg.highlight.trim())
    blocks.push({ kind: "pill", text: cfg.highlight.trim(), size: 62, minSize: 30, weight: "bold", color: p.pillText, bg: p.pillBg, maxLines: 1, gapAfter: 22 });
  if (cfg.cta.trim())
    blocks.push({ kind: "text", text: cfg.cta.trim(), size: 42, minSize: 22, weight: "bold", color: p.accentText, maxLines: 2, gapAfter: 10 });
  if (cfg.extra.trim())
    blocks.push({ kind: "text", text: cfg.extra.trim(), size: 26, minSize: 18, weight: "normal", color: p.body, maxLines: 2, gapAfter: 0 });
  return blocks;
}

/** Fits the blocks into `area` (shrinking if needed) and draws them. */
function drawTextArea(ctx: CanvasRenderingContext2D, blocks: Block[], area: Rect, st: FlowStyle, base: number, bottomAlign: boolean) {
  if (!blocks.length) return;
  let scale = base;
  while (scale > base * 0.5 && flow(ctx, blocks, area, st, scale, false, 0) > area.h) scale -= 0.04;
  const used = flow(ctx, blocks, area, st, scale, false, 0);
  const free = Math.max(0, area.h - used);
  const top = bottomAlign ? area.y + free : area.y + Math.min(free / 2, 70 * base);
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x - 8, area.y - 8, area.w + 16, area.h + 16);
  ctx.clip();
  flow(ctx, blocks, area, st, scale, true, top);
  ctx.restore();
}

function drawBadge(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fam: string, k: number, c: PosterColors) {
  const t = text.trim();
  if (!t) return;
  const size = Math.round(34 * k);
  ctx.font = `bold ${size}px ${fam}`;
  ctx.direction = isRtl(t) ? "rtl" : "ltr";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const w = ctx.measureText(t).width + size * 1.3;
  const h = size * 1.9;
  ctx.fillStyle = c.primary;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = onColor(c.primary);
  ctx.fillText(t, x + size * 0.65, y + h * 0.66);
}

export function drawLogoBadge(ctx: CanvasRenderingContext2D, logo: HTMLImageElement, right: number, top: number, height: number) {
  const { w: lw, h: lh } = dims(logo);
  const pad = height * 0.18;
  const h = height;
  const w = (lw / lh) * (h - pad * 2) + pad * 2;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, right - w, top, w, h, h * 0.22);
  ctx.fill();
  ctx.drawImage(logo, right - w + pad, top + pad, w - pad * 2, h - pad * 2);
}

export function drawFooter(ctx: CanvasRenderingContext2D, r: Rect, fam: string, k: number, c: PosterColors) {
  ctx.fillStyle = c.primary;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  const fg = onColor(c.primary);
  const phones = `Call / WhatsApp: ${site.phoneDisplay}  |  ${site.phoneDisplay2}`;
  const web = `${site.websiteUrl.replace(/^https?:\/\//, "")}  |  ${site.addressShort}`;
  const padX = r.w * 0.045;
  const size1 = Math.round(Math.min(40 * k, r.h * 0.36));
  const size2 = Math.round(Math.min(28 * k, r.h * 0.26));
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = fg;
  ctx.font = `bold ${size1}px ${fam}`;
  ctx.fillText(phones, r.x + padX, r.y + r.h * 0.46, r.w - padX * 2);
  ctx.globalAlpha = 0.9;
  ctx.font = `${size2}px ${fam}`;
  ctx.fillText(web, r.x + padX, r.y + r.h * 0.46 + size2 * 1.45, r.w - padX * 2);
  ctx.globalAlpha = 1;
}

function renderPoster(ctx: CanvasRenderingContext2D, W: number, H: number, size: PosterSizeId, cfg: PosterConfig, pictures: Img[], logo: HTMLImageElement | null) {
  const c = cfg.colors;
  const fam = POSTER_FONTS[cfg.font].family;
  const imgs = pictures.slice(0, POSTER_LIMITS.pictures);
  const wide = size === "landscape";
  const tall = size === "portrait" || size === "story";
  const k = (Math.min(W, H) / 1080) * (size === "story" ? 1.3 : 1);
  const pad = Math.round(Math.min(W, H) * 0.055);
  const gap = Math.max(4, Math.round(6 * Math.max(k, 0.7)));
  const radius = cfg.rounded ? Math.round(30 * Math.max(k, 0.7)) : 0;
  const footerH = cfg.showContact ? Math.round(wide ? H * 0.17 : H * 0.085) : 0;
  const logoH = Math.round(Math.max(56, Math.min(W, H) * 0.075));
  const st: FlowStyle = { family: fam, bullet: c.primary, bulletMark: onColor(c.primary) };

  ctx.fillStyle = c.background;
  ctx.fillRect(0, 0, W, H);

  const photo = (r: Rect) => {
    if (imgs.length) drawCollage(ctx, imgs, r, gap, radius);
    else drawPlaceholder(ctx, r, c, radius);
  };
  const decorate = (img: Rect, inset: number) => {
    drawBadge(ctx, cfg.badge, img.x + inset, img.y + inset, fam, Math.max(k, 0.62), c);
    if (cfg.showLogo && logo) drawLogoBadge(ctx, logo, img.x + img.w - inset, img.y + inset, logoH);
  };

  const lightPalette: Palette = {
    head: c.text,
    body: withAlpha(c.text, 0.82),
    accentText: c.primary,
    pillBg: c.primary,
    pillText: onColor(c.primary),
    bullet: c.primary,
    bulletMark: onColor(c.primary),
  };

  if (cfg.layout === "overlay") {
    const full: Rect = { x: 0, y: 0, w: W, h: H };
    if (imgs.length) drawCollage(ctx, imgs, full, gap, 0);
    else drawPlaceholder(ctx, full, c, 0);
    const g = ctx.createLinearGradient(0, H * 0.16, 0, H * 0.6);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.88)");
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.16, W, H * 0.84);
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fillRect(0, 0, W, H * 0.22);
    decorate(full, pad);
    const p: Palette = {
      head: "#FFFFFF",
      body: "rgba(255,255,255,0.9)",
      accentText: c.accent,
      pillBg: c.primary,
      pillText: onColor(c.primary),
      bullet: c.primary,
      bulletMark: onColor(c.primary),
    };
    const top = wide ? H * 0.12 : H * 0.34;
    const area: Rect = { x: pad, y: top, w: W - pad * 2, h: H - footerH - top - pad * 0.5 };
    drawTextArea(ctx, makeBlocks(cfg, p), area, st, k, true);
    if (footerH) drawFooter(ctx, { x: 0, y: H - footerH, w: W, h: footerH }, fam, Math.max(k, 0.62), c);
    return;
  }

  if (cfg.layout === "side" && !tall) {
    // text on the left, pictures on the right
    const textW = Math.round(W * 0.46);
    const imgRect: Rect = { x: textW, y: 0, w: W - textW, h: H - footerH };
    photo(cfg.rounded ? { x: textW, y: pad * 0.6, w: W - textW - pad * 0.6, h: H - footerH - pad * 1.2 } : imgRect);
    ctx.fillStyle = c.primary;
    ctx.fillRect(textW - 8, 0, 8, H - footerH);
    decorate(imgRect, Math.round(pad * 0.7));
    const area: Rect = { x: pad, y: pad * (wide ? 0.8 : 1), w: textW - pad * 1.6, h: H - footerH - pad * 1.8 };
    drawTextArea(ctx, makeBlocks(cfg, lightPalette), area, st, k, false);
    if (footerH) drawFooter(ctx, { x: 0, y: H - footerH, w: W, h: footerH }, fam, Math.max(k, 0.62), c);
    return;
  }

  // "Picture on top" - and the tall "Side by side": picture at the bottom
  const flip = cfg.layout === "side";
  const imgH = Math.round(H * (wide ? 0.5 : size === "story" ? 0.44 : size === "portrait" ? 0.48 : 0.47));
  const imgY = flip ? H - footerH - imgH : 0;
  const imgRect: Rect = { x: 0, y: imgY, w: W, h: imgH };
  photo(cfg.rounded ? { x: pad * 0.6, y: imgY + (flip ? 0 : pad * 0.6), w: W - pad * 1.2, h: imgH - pad * 0.6 } : imgRect);
  ctx.fillStyle = c.primary;
  ctx.fillRect(0, flip ? imgY - 10 : imgY + imgH - 4, W, 10);
  decorate(imgRect, Math.round(pad * 0.7));
  const textTop = flip ? pad * 0.9 : imgY + imgH + pad * 0.5;
  const textBottom = flip ? imgY - pad * 0.5 : H - footerH - pad * 0.3;
  const area: Rect = { x: pad, y: textTop, w: W - pad * 2, h: textBottom - textTop };
  drawTextArea(ctx, makeBlocks(cfg, lightPalette), area, st, k, false);
  if (footerH) drawFooter(ctx, { x: 0, y: H - footerH, w: W, h: footerH }, fam, Math.max(k, 0.62), c);
}

export function drawPoster(canvas: HTMLCanvasElement, cfg: PosterConfig, pictures: Img[], logo: HTMLImageElement | null) {
  const { w: W, h: H } = POSTER_SIZES[cfg.size];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (cfg.size === "story" && cfg.safeZones) {
    // The apps cover the top and bottom of a story with their own buttons, so
    // the poster is drawn in the safe middle part on a plain colour background.
    const top = Math.round(H * 0.11);
    const bottom = Math.round(H * 0.17);
    const innerH = H - top - bottom;
    ctx.fillStyle = cfg.colors.primary;
    ctx.fillRect(0, 0, W, H);
    const inner = document.createElement("canvas");
    inner.width = W;
    inner.height = innerH;
    const ictx = inner.getContext("2d");
    if (!ictx) return;
    renderPoster(ictx, W, innerH, "portrait", cfg, pictures, logo);
    ctx.drawImage(inner, 0, top);
    return;
  }
  renderPoster(ctx, W, H, cfg.size, cfg, pictures, logo);
}
