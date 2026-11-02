import { site } from "./site";
import {
  POSTER_FONTS,
  POSTER_SCHEMES,
  drawFooter,
  drawLogoBadge,
  dims,
  isRtl,
  onColor,
  roundRect,
  withAlpha,
  wrap,
  type PosterColors,
  type PosterFontId,
} from "./posterMaker";

// A small in-browser video editor for ads: the admin picks a video, trims it,
// puts a logo, a caption and the company details on top, optionally adds a
// contact end card, and records the result. Nothing is uploaded anywhere.

export type VideoFormatId = "original" | "vertical" | "portrait" | "square" | "wide";

export const VIDEO_FORMATS: Record<VideoFormatId, { label: string; hint: string }> = {
  vertical: { label: "Vertical 9:16", hint: "Reels, Stories, TikTok, Shorts, WhatsApp Status" },
  portrait: { label: "Portrait 4:5", hint: "Facebook and Instagram feed (best size)" },
  square: { label: "Square 1:1", hint: "Works on every feed" },
  wide: { label: "Wide 16:9", hint: "YouTube, Facebook video, LinkedIn" },
  original: { label: "Same as video", hint: "Keep the video's own shape" },
};

export type VideoFitId = "fill" | "fit";
export type CornerId = "tl" | "tr" | "bl" | "br";
export type CaptionPosition = "top" | "bottom";

export interface VideoEditConfig {
  format: VideoFormatId;
  fit: VideoFitId;
  start: number;
  end: number;
  keepSound: boolean;
  colors: PosterColors;
  font: PosterFontId;
  showLogo: boolean;
  logoCorner: CornerId;
  logoSize: "small" | "medium" | "large";
  caption: string;
  captionPosition: CaptionPosition;
  showDetails: boolean;
  /** Keeps text clear of the buttons the apps draw at the top and bottom of vertical videos. */
  safeZones: boolean;
  endCard: boolean;
  endCardText: string;
}

export const VIDEO_DEFAULTS: VideoEditConfig = {
  format: "vertical",
  fit: "fill",
  start: 0,
  end: 0,
  keepSound: true,
  colors: POSTER_SCHEMES[0].colors,
  font: "modern",
  showLogo: true,
  logoCorner: "tr",
  logoSize: "medium",
  caption: "",
  captionPosition: "top",
  showDetails: true,
  safeZones: true,
  endCard: true,
  endCardText: "Contact us today",
};

export const VIDEO_LIMITS = {
  fileBytes: 700 * 1024 * 1024,
  caption: 100,
  endCardText: 60,
  endCardSeconds: 3,
} as const;

/** Size of the finished video. Kept at 720p so a normal computer can record it in real time. */
export function outputSize(format: VideoFormatId, vw: number, vh: number): { w: number; h: number } {
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  if (format === "vertical") return { w: 720, h: 1280 };
  if (format === "portrait") return { w: 864, h: 1080 };
  if (format === "square") return { w: 720, h: 720 };
  if (format === "wide") return { w: 1280, h: 720 };
  const long = 1280;
  const scale = Math.min(1, long / Math.max(vw, vh));
  return { w: even(vw * scale), h: even(vh * scale) };
}

/** The best recording format this browser can make (MP4 plays everywhere, WebM is the fallback). */
export function pickRecorderMime(): { mime: string; ext: "mp4" | "webm" } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const options: { mime: string; ext: "mp4" | "webm" }[] = [
    { mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4" },
    { mime: "video/mp4;codecs=avc1", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  return options.find((o) => MediaRecorder.isTypeSupported(o.mime)) ?? null;
}

type Source = HTMLVideoElement;

function drawVideoLayer(ctx: CanvasRenderingContext2D, v: Source, W: number, H: number, fit: VideoFitId) {
  const vw = v.videoWidth || 1;
  const vh = v.videoHeight || 1;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  if (fit === "fill") {
    const s = Math.max(W / vw, H / vh);
    ctx.drawImage(v, (W - vw * s) / 2, (H - vh * s) / 2, vw * s, vh * s);
    return;
  }
  // "fit": the whole video is visible, a blurred copy fills the sides
  const sBack = Math.max(W / vw, H / vh);
  ctx.save();
  ctx.filter = "blur(28px) brightness(0.7)";
  ctx.drawImage(v, (W - vw * sBack) / 2 - 20, (H - vh * sBack) / 2 - 20, vw * sBack + 40, vh * sBack + 40);
  ctx.restore();
  const s = Math.min(W / vw, H / vh);
  ctx.drawImage(v, (W - vw * s) / 2, (H - vh * s) / 2, vw * s, vh * s);
}

function drawCaption(ctx: CanvasRenderingContext2D, text: string, W: number, y: number, fam: string, c: PosterColors, k: number) {
  const t = text.trim();
  if (!t) return 0;
  const size = Math.round(46 * k);
  const padX = Math.round(W * 0.05);
  ctx.font = `bold ${size}px ${fam}`;
  const lines = wrap(ctx, t, W - padX * 4).slice(0, 3);
  const lh = size * 1.22;
  const boxH = lines.length * lh + size * 0.9;
  ctx.fillStyle = withAlpha(c.primary, 0.92);
  roundRect(ctx, padX, y, W - padX * 2, boxH, size * 0.45);
  ctx.fill();
  ctx.fillStyle = onColor(c.primary);
  const rtl = isRtl(t);
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textAlign = rtl ? "right" : "left";
  ctx.textBaseline = "alphabetic";
  lines.forEach((l, i) => ctx.fillText(l, rtl ? W - padX * 2 : padX * 2, y + size * 0.45 + lh * (i + 0.82), W - padX * 4));
  return boxH;
}

/** Draws one frame: the video plus logo, caption and company details. */
export function drawVideoFrame(ctx: CanvasRenderingContext2D, v: Source, W: number, H: number, cfg: VideoEditConfig, logo: HTMLImageElement | null) {
  const fam = POSTER_FONTS[cfg.font].family;
  const k = Math.min(W, H) / 720;
  const pad = Math.round(Math.min(W, H) * 0.045);
  drawVideoLayer(ctx, v, W, H, cfg.fit);

  const safe = cfg.safeZones && cfg.format === "vertical";
  const topR = safe ? Math.round(H * 0.12) : 0;
  const botR = safe ? Math.round(H * 0.2) : 0;
  const footerH = cfg.showDetails ? Math.round(Math.max(H * 0.08, 96 * k)) : 0;
  if (footerH) {
    const fy = H - botR - footerH;
    if (safe) {
      ctx.save();
      roundRect(ctx, pad, fy, W - pad * 2, footerH, footerH * 0.22);
      ctx.clip();
      drawFooter(ctx, { x: pad, y: fy, w: W - pad * 2, h: footerH }, fam, Math.max(k, 0.7), cfg.colors);
      ctx.restore();
    } else {
      drawFooter(ctx, { x: 0, y: fy, w: W, h: footerH }, fam, Math.max(k, 0.7), cfg.colors);
    }
  }

  if (cfg.caption.trim()) {
    const size = Math.round(46 * k);
    const estimated = size * 1.22 * 2 + size * 0.9;
    const y = cfg.captionPosition === "top" ? topR + pad : H - botR - footerH - pad - estimated;
    drawCaption(ctx, cfg.caption, W, y, fam, cfg.colors, k);
  }

  if (cfg.showLogo && logo) {
    const base = Math.min(W, H) * (cfg.logoSize === "small" ? 0.09 : cfg.logoSize === "large" ? 0.17 : 0.125);
    const h = Math.round(Math.max(48, base));
    const { w: lw, h: lh } = dims(logo);
    const w = (lw / lh) * (h - h * 0.36) + h * 0.36;
    const left = cfg.logoCorner === "tl" || cfg.logoCorner === "bl";
    const top = cfg.logoCorner === "tl" || cfg.logoCorner === "tr";
    const captionTop = cfg.caption.trim() && cfg.captionPosition === "top";
    const topY = topR + pad + (captionTop && top ? Math.round(46 * k * 1.22 * 2 + 46 * k * 0.9 + pad * 0.4) : 0);
    const y = top ? topY : H - botR - footerH - pad - h;
    const right = left ? pad + w : W - pad;
    drawLogoBadge(ctx, logo, right, y, h);
  }
}

/** The contact card shown for a few seconds after the video. `t` goes 0..1 for the fade-in. */
export function drawEndCard(ctx: CanvasRenderingContext2D, W: number, H: number, cfg: VideoEditConfig, logo: HTMLImageElement | null, t: number) {
  const c = cfg.colors;
  const fam = POSTER_FONTS[cfg.font].family;
  const k = Math.min(W, H) / 720;
  ctx.globalAlpha = Math.min(1, t * 2.5);
  ctx.fillStyle = c.background;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = c.primary;
  ctx.fillRect(0, 0, W, Math.round(14 * k));
  ctx.fillRect(0, H - Math.round(14 * k), W, Math.round(14 * k));

  let y = H * 0.2;
  if (logo) {
    const { w: lw, h: lh } = dims(logo);
    const h = Math.min(H * 0.17, 210 * k);
    const w = (lw / lh) * h;
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, (W - w) / 2 - 16 * k, y - 12 * k, w + 32 * k, h + 24 * k, 22 * k);
    ctx.fill();
    ctx.drawImage(logo, (W - w) / 2, y, w, h);
    y += h + 70 * k;
  }

  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const center = (text: string, size: number, color: string, weight: "bold" | "normal" = "bold") => {
    ctx.font = `${weight} ${Math.round(size * k)}px ${fam}`;
    ctx.fillStyle = color;
    ctx.fillText(text, W / 2, y, W * 0.9);
    y += size * k * 1.45;
  };
  if (cfg.endCardText.trim()) center(cfg.endCardText.trim(), 54, c.text);
  y += 14 * k;
  center(site.fullName, 42, c.primary);
  y += 10 * k;
  center(`Call / WhatsApp: ${site.phoneDisplay}`, 40, c.text);
  center(site.phoneDisplay2, 40, c.text);
  center(site.websiteUrl.replace(/^https?:\/\//, ""), 36, c.primary);
  center(site.addressShort, 30, c.text, "normal");
  ctx.globalAlpha = 1;
}
