// Builds a 9:16 (1080x1920) promo video entirely in the admin's browser:
// photos with a slow zoom, the property's own details as captions, a company
// card and contact card, optional female narration, and light synthesized
// background music. Everything is drawn on a canvas and recorded with
// MediaRecorder, so no server-side video software is needed.

import { LOGO_DATA_URI, LOGO_ASPECT } from "@/lib/pdf/logoData";

const W = 1080;
const H = 1920;
const FPS = 30;

const RED = "#C81E2C";
const DARK_RED = "#7A1219";
const PINK = "#F9D9DC";
const FONT = `Arial, "Segoe UI", Helvetica, sans-serif`;

export interface ReelData {
  slug: string;
  title: string;
  location: string;
  badge: string;
  demand: string;
  facts: { label: string; value: string }[];
  features: string[];
  images: string[];
  companyName: string;
  about: string;
  tagline: string;
  director: string;
  services: string[];
  phones: string[];
  email: string;
  website: string;
  qr: string;
  narration: { lang: "en" | "ur"; description: string; closing: string };
}

export interface ReelOptions {
  data: ReelData;
  /** mp3 bytes of the spoken description / closing, or null for a silent video. */
  description: ArrayBuffer | null;
  closing: ArrayBuffer | null;
  music: boolean;
  onProgress?: (fraction: number, label: string) => void;
  signal?: AbortSignal;
}

export interface ReelResult {
  blob: Blob;
  extension: "mp4" | "webm";
  seconds: number;
  hasVoice: boolean;
}

// ---------------------------------------------------------------- helpers

function dataUriToBlob(uri: string): Blob {
  const [head, b64] = uri.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function loadBitmap(src: string): Promise<ImageBitmap | null> {
  try {
    // data: URIs are decoded by hand - fetch() of data: is blocked by the
    // site's connect-src policy.
    if (src.startsWith("data:")) return await createImageBitmap(dataUriToBlob(src));
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

const ARABIC = /[؀-ۿݐ-ݿ]/g;
function isRtl(text: string) {
  const ar = (text.match(ARABIC) ?? []).length;
  return ar > text.replace(/[^A-Za-z]/g, "").length;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws wrapped text; shrinks the font until it fits `maxLines`. Returns the height used. */
function drawFitted(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  opts: { size: number; minSize: number; weight?: string; color: string; align?: CanvasTextAlign; lineGap?: number }
) {
  const rtl = isRtl(text);
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textAlign = opts.align ?? "left";
  ctx.textBaseline = "top";
  let size = opts.size;
  let lines: string[] = [];
  let lh = size * (opts.lineGap ?? 1.3);
  for (; size >= opts.minSize; size -= 2) {
    ctx.font = `${opts.weight ?? "normal"} ${size}px ${FONT}`;
    lines = wrapLines(ctx, text, maxWidth);
    lh = size * (opts.lineGap ?? 1.3);
    if (lines.length * lh <= maxHeight) break;
  }
  // If it still does not fit at the smallest size, keep the lines that do.
  const fit = Math.max(1, Math.floor(maxHeight / lh));
  if (lines.length > fit) lines = [...lines.slice(0, fit - 1), `${lines[fit - 1].replace(/\s+\S*$/, "")}...`];
  ctx.fillStyle = opts.color;
  const ax = ctx.textAlign === "center" ? x + maxWidth / 2 : ctx.textAlign === "right" ? x + maxWidth : x;
  lines.forEach((l, i) => ctx.fillText(l, ax, y + i * lh));
  ctx.direction = "ltr";
  return lines.length * lh;
}

function splitCaptions(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?۔])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (p.length <= 150) {
      out.push(p);
      continue;
    }
    // very long sentence: break at commas/spaces so captions stay readable
    let rest = p;
    while (rest.length > 150) {
      let cut = rest.lastIndexOf(",", 150);
      if (cut < 60) cut = rest.lastIndexOf(" ", 150);
      if (cut < 40) cut = 150;
      out.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest) out.push(rest);
  }
  return out.length ? out : [text];
}

/** A recording can occasionally contain audio but no picture; catch that
 *  here instead of handing the admin a broken file. */
async function hasPicture(blob: Blob): Promise<boolean> {
  const url = URL.createObjectURL(blob);
  try {
    const v = document.createElement("video");
    v.muted = true;
    v.preload = "metadata";
    v.src = url;
    await new Promise<void>((resolve) => {
      v.onloadedmetadata = () => resolve();
      v.onerror = () => resolve();
      setTimeout(resolve, 6000);
    });
    return v.videoWidth > 0 && v.videoHeight > 0;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ease(p: number) {
  return p < 0 ? 0 : p > 1 ? 1 : p * p * (3 - 2 * p);
}

// ------------------------------------------------------------------ music

/** Light, original ambient music made from oscillators (nothing sampled, so
 *  there is no copyright to worry about). Chords Am - F - C - G, a soft pad,
 *  a gentle plucked arpeggio and a quiet bass, with an echo for warmth. */
function scheduleMusic(
  ctx: AudioContext,
  out: AudioNode,
  startAt: number,
  total: number,
  voice: { from: number; to: number }[]
) {
  const master = ctx.createGain();
  master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(out);

  const echo = ctx.createDelay(1);
  echo.delayTime.value = 0.36;
  const fb = ctx.createGain();
  fb.gain.value = 0.28;
  const echoTone = ctx.createBiquadFilter();
  echoTone.type = "lowpass";
  echoTone.frequency.value = 1800;
  echo.connect(echoTone);
  echoTone.connect(fb);
  fb.connect(echo);
  echoTone.connect(master);

  const padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 1000;
  padFilter.connect(master);

  const chords = [
    { pad: [220, 261.63, 329.63], bass: 110, arp: [440, 523.25, 659.25] }, // Am
    { pad: [174.61, 220, 261.63], bass: 87.31, arp: [349.23, 440, 523.25] }, // F
    { pad: [261.63, 329.63, 392], bass: 130.81, arp: [523.25, 659.25, 784] }, // C
    { pad: [196, 246.94, 293.66], bass: 98, arp: [392, 493.88, 587.33] }, // G
  ];
  const beat = 60 / 76;
  const bar = beat * 4;
  const bars = Math.ceil(total / bar) + 1;

  for (let b = 0; b < bars; b++) {
    const c = chords[b % chords.length];
    const t0 = startAt + b * bar;

    for (const f of c.pad) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.16, t0 + 0.7);
      g.gain.linearRampToValueAtTime(0.1, t0 + bar - 0.5);
      g.gain.linearRampToValueAtTime(0, t0 + bar + 0.6);
      osc.connect(g);
      g.connect(padFilter);
      osc.start(t0);
      osc.stop(t0 + bar + 0.7);
    }

    const bass = ctx.createOscillator();
    bass.type = "sine";
    bass.frequency.value = c.bass;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0, t0);
    bg.gain.linearRampToValueAtTime(0.18, t0 + 0.3);
    bg.gain.linearRampToValueAtTime(0, t0 + bar);
    bass.connect(bg);
    bg.connect(master);
    bass.start(t0);
    bass.stop(t0 + bar + 0.1);

    const pattern = [0, 1, 2, 1, 0, 2, 1, 2];
    pattern.forEach((idx, i) => {
      const nt = t0 + i * (beat / 2);
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = c.arp[idx];
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, nt);
      g.gain.linearRampToValueAtTime(0.22, nt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, nt + 0.6);
      osc.connect(g);
      g.connect(master);
      g.connect(echo);
      osc.start(nt);
      osc.stop(nt + 0.65);
    });
  }
  // Loudness plan: gently in, quiet while someone is speaking, fuller in the gaps, out at the end.
  const hi = 0.5;
  const lo = 0.17;
  const g = master.gain;
  g.setValueAtTime(0, startAt);
  g.linearRampToValueAtTime(hi, startAt + 1.2);
  for (const v of voice) {
    g.setTargetAtTime(lo, startAt + v.from - 0.25, 0.25);
    g.setTargetAtTime(hi, startAt + v.to + 0.1, 0.5);
  }
  g.setValueAtTime(hi, startAt + Math.max(0, total - 1.8));
  g.linearRampToValueAtTime(0, startAt + total);
}

// ------------------------------------------------------------------- main

export async function createReelVideo(opts: ReelOptions): Promise<ReelResult> {
  const { data } = opts;
  const progress = opts.onProgress ?? (() => {});
  const throwIfAborted = () => {
    if (opts.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
  };

  if (typeof MediaRecorder === "undefined") throw new Error("This browser cannot record video. Please use Google Chrome.");

  progress(0, "Loading photos...");
  const [photoBitmaps, logo, qr] = await Promise.all([
    Promise.all(data.images.map(loadBitmap)),
    loadBitmap(LOGO_DATA_URI),
    data.qr ? loadBitmap(data.qr) : Promise.resolve(null),
  ]);
  throwIfAborted();
  const photos = photoBitmaps.filter((b): b is ImageBitmap => Boolean(b));

  // Pre-render one blurred, darkened full-frame background per photo.
  const backdrops = photos.map((img) => {
    const c = document.createElement("canvas");
    c.width = W / 4;
    c.height = H / 4;
    const x = c.getContext("2d")!;
    const s = Math.max(c.width / img.width, c.height / img.height);
    x.filter = "blur(10px)";
    x.drawImage(img, (c.width - img.width * s) / 2, (c.height - img.height * s) / 2, img.width * s, img.height * s);
    x.filter = "none";
    x.fillStyle = "rgba(20,0,6,0.55)";
    x.fillRect(0, 0, c.width, c.height);
    return c;
  });

  // ---- audio
  progress(0.02, "Preparing audio...");
  const audioCtx = new AudioContext();
  await audioCtx.resume();
  const decode = async (buf: ArrayBuffer | null) => {
    if (!buf) return null;
    try {
      return await audioCtx.decodeAudioData(buf.slice(0));
    } catch {
      return null;
    }
  };
  const [descAudio, closeAudio] = await Promise.all([decode(opts.description), decode(opts.closing)]);
  throwIfAborted();
  const hasVoice = Boolean(descAudio || closeAudio);

  // ---- timeline (seconds)
  const words = data.narration.description.split(/\s+/).length;
  const lead = 0.5;
  const D = descAudio ? descAudio.duration : Math.min(40, Math.max(10, words / 2.6));
  const C = closeAudio ? closeAudio.duration : 10;
  const descStart = lead;
  const descEnd = descStart + D;
  const closeStart = descEnd + 0.7;
  const closeEnd = closeStart + C;
  const total = closeEnd + 1.5;
  const companyUntil = closeStart + Math.min(C * 0.45, 7);

  const captions = splitCaptions(data.narration.description);
  const weights = captions.map((c) => Math.max(18, c.length));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const capTimes: number[] = [];
  {
    let acc = descStart;
    for (const w of weights) {
      capTimes.push(acc);
      acc += (w / weightSum) * D;
    }
    capTimes.push(descEnd);
  }

  // ---- canvas + recorder
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false })!;

  const dest = audioCtx.createMediaStreamDestination();
  const startAt = audioCtx.currentTime + 0.4;
  const voiceWindows: { from: number; to: number }[] = [];
  if (descAudio) {
    const src = audioCtx.createBufferSource();
    src.buffer = descAudio;
    src.connect(dest);
    src.start(startAt + descStart);
    voiceWindows.push({ from: descStart, to: descEnd });
  }
  if (closeAudio) {
    const src = audioCtx.createBufferSource();
    src.buffer = closeAudio;
    src.connect(dest);
    src.start(startAt + closeStart);
    voiceWindows.push({ from: closeStart, to: closeEnd });
  }
  if (opts.music) scheduleMusic(audioCtx, dest, startAt, total, voiceWindows);

  const stream = canvas.captureStream(FPS);
  const wantsAudio = hasVoice || opts.music;
  if (wantsAudio) dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

  const mimeCandidates = [
    "video/mp4;codecs=avc1.640028,mp4a.40.2",
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
  const recorder = new MediaRecorder(stream, {
    ...(mime ? { mimeType: mime } : {}),
    videoBitsPerSecond: 6_000_000,
    audioBitsPerSecond: 128_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // ---- drawing
  const logoH = (w: number) => w / LOGO_ASPECT;

  function drawPhotoScene(t: number) {
    const slot = 4.2;
    const n = Math.max(1, photos.length);
    const idx = Math.floor(t / slot) % n;
    const local = (t % slot) / slot;

    const drawOne = (i: number, alpha: number, prog: number) => {
      if (photos.length === 0) return;
      ctx.globalAlpha = alpha;
      ctx.drawImage(backdrops[i], 0, 0, W, H);
      ctx.globalAlpha = 1;

      const box = { x: 0, y: 290, w: W, h: 940 };
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.rect(box.x, box.y, box.w, box.h);
      ctx.clip();
      const img = photos[i];
      const base = Math.min(box.w / img.width, box.h / img.height);
      const s = base * (1.0 + 0.12 * prog);
      const w = img.width * s;
      const h = img.height * s;
      ctx.drawImage(img, box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h);
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    // dark base so crossfades never flash white
    ctx.fillStyle = "#14000a";
    ctx.fillRect(0, 0, W, H);
    drawOne(idx, 1, local);
    if (photos.length > 1 && local > 0.86) {
      drawOne((idx + 1) % n, ease((local - 0.86) / 0.14), 0);
    }
    if (photos.length === 0) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#7A1219");
      g.addColorStop(1, "#2a0409");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawLogoAndBadge() {
    const lw = 340;
    const pad = 16;
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, 56, 70, lw + pad * 2, logoH(lw) + pad * 2, 22);
    ctx.fill();
    if (logo) ctx.drawImage(logo, 56 + pad, 70 + pad, lw, logoH(lw));
    ctx.fillStyle = RED;
    ctx.fillRect(56 + 6, 70 + logoH(lw) + pad * 2 - 6, lw + pad * 2 - 12, 6);

    if (data.badge) {
      ctx.font = `bold 36px ${FONT}`;
      const tw = ctx.measureText(data.badge).width;
      const bw = tw + 70;
      ctx.fillStyle = RED;
      roundRect(ctx, W - 56 - bw, 90, bw, 80, 40);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(data.badge, W - 56 - bw / 2, 131);
    }
  }

  function drawIntroPanel(alpha: number) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(20,0,6,0.78)";
    roundRect(ctx, 48, 1270, W - 96, 460, 30);
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.fillRect(48, 1270 + 24, 10, 150);

    let y = 1300;
    y += drawFitted(ctx, data.title, 84, y, W - 168, 190, { size: 62, minSize: 40, weight: "bold", color: "#FFFFFF" }) + 6;
    y += drawFitted(ctx, data.location, 84, y, W - 168, 100, { size: 38, minSize: 28, color: PINK }) + 14;
    const facts = data.facts.map((f) => f.value).filter(Boolean).join("   |   ");
    if (facts) y += drawFitted(ctx, facts, 84, y, W - 168, 100, { size: 36, minSize: 26, weight: "bold", color: "#FFFFFF" }) + 14;
    if (data.demand) {
      ctx.font = `bold 62px ${FONT}`;
      const label = "DEMAND";
      const vw = ctx.measureText(data.demand).width;
      const bw = Math.min(W - 168, Math.max(vw + 70, 360));
      ctx.fillStyle = RED;
      roundRect(ctx, 84, Math.min(y, 1730 - 140), bw, 120, 16);
      ctx.fill();
      ctx.fillStyle = PINK;
      ctx.font = `bold 24px ${FONT}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(label, 84 + 28, Math.min(y, 1730 - 140) + 14);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold 58px ${FONT}`;
      ctx.fillText(data.demand, 84 + 28, Math.min(y, 1730 - 140) + 44, bw - 56);
    }
    ctx.globalAlpha = 1;
  }

  function drawCaptionPanel(text: string, alpha: number) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(20,0,6,0.72)";
    roundRect(ctx, 48, 1270, W - 96, 460, 30);
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.fillRect(48, 1270 + 24, 10, 150);
    drawFitted(ctx, text, 90, 1300, W - 180, 400, { size: 54, minSize: 34, weight: "bold", color: "#FFFFFF", align: isRtl(text) ? "center" : "left", lineGap: 1.35 });
    ctx.globalAlpha = 1;
  }

  function drawClosingBackground(t: number) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#8a1520");
    g.addColorStop(1, "#2a0409");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (backdrops[0]) {
      ctx.globalAlpha = 0.18;
      const z = 1 + 0.06 * ((t - closeStart) / Math.max(1, C));
      ctx.drawImage(backdrops[0], (W - W * z) / 2, (H - H * z) / 2, W * z, H * z);
      ctx.globalAlpha = 1;
    }
  }

  function drawCompanyCard(alpha: number) {
    ctx.globalAlpha = alpha;
    const lw = 640;
    const pad = 24;
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, (W - lw - pad * 2) / 2, 250, lw + pad * 2, logoH(lw) + pad * 2, 30);
    ctx.fill();
    if (logo) ctx.drawImage(logo, (W - lw) / 2, 250 + pad, lw, logoH(lw));
    let y = 250 + logoH(lw) + pad * 2 + 70;
    y += drawFitted(ctx, `About ${data.companyName}`, 70, y, W - 140, 120, { size: 52, minSize: 38, weight: "bold", color: "#FFFFFF", align: "center" }) + 24;
    y += drawFitted(ctx, data.about, 90, y, W - 180, 330, { size: 44, minSize: 32, color: PINK, align: "center", lineGap: 1.4 }) + 20;
    y += drawFitted(ctx, data.director, 90, y, W - 180, 70, { size: 40, minSize: 30, weight: "bold", color: "#FFFFFF", align: "center" }) + 40;

    const tileW = 440;
    const tileH = 110;
    data.services.slice(0, 4).forEach((s, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = W / 2 + (col === 0 ? -tileW - 14 : 14);
      const ty = y + row * (tileH + 24);
      ctx.fillStyle = "#FFFFFF";
      roundRect(ctx, x, ty, tileW, tileH, 18);
      ctx.fill();
      ctx.fillStyle = RED;
      ctx.fillRect(x, ty, tileW, 8);
      ctx.fillStyle = DARK_RED;
      ctx.font = `bold 40px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(s, x + tileW / 2, ty + tileH / 2 + 4, tileW - 30);
    });
    ctx.fillStyle = PINK;
    ctx.font = `bold 34px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(data.tagline, W / 2, y + 2 * (tileH + 24) + 30, W - 120);
    ctx.globalAlpha = 1;
  }

  function drawContactCard(alpha: number) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = RED;
    ctx.font = `bold 56px ${FONT}`;
    const label = "CONTACT US";
    const lw = ctx.measureText(label).width + 100;
    roundRect(ctx, (W - lw) / 2, 230, lw, 110, 55);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, W / 2, 287);

    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    let y = 420;
    ctx.font = `bold 40px ${FONT}`;
    ctx.fillStyle = PINK;
    ctx.fillText(data.companyName, W / 2, y, W - 100);
    y += 90;
    for (const p of data.phones.slice(0, 2)) {
      ctx.font = `bold 78px ${FONT}`;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(p, W / 2, y, W - 80);
      y += 112;
    }
    y += 10;
    ctx.font = `42px ${FONT}`;
    ctx.fillStyle = PINK;
    ctx.fillText(data.email, W / 2, y, W - 80);
    y += 70;
    ctx.font = `bold 46px ${FONT}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(data.website, W / 2, y, W - 80);
    y += 110;

    if (qr) {
      const q = 380;
      ctx.fillStyle = "#FFFFFF";
      roundRect(ctx, (W - q - 40) / 2, y, q + 40, q + 40, 24);
      ctx.fill();
      ctx.drawImage(qr, (W - q) / 2, y + 20, q, q);
      ctx.fillStyle = PINK;
      ctx.font = `bold 36px ${FONT}`;
      ctx.textBaseline = "top";
      ctx.fillText("Scan for details", W / 2, y + q + 64);
    }
    ctx.globalAlpha = 1;
  }

  function drawFrame(t: number) {
    if (t < closeStart - 0.3) {
      drawPhotoScene(Math.max(0, t));
      // top/bottom shading for legibility
      const top = ctx.createLinearGradient(0, 0, 0, 300);
      top.addColorStop(0, "rgba(0,0,0,0.55)");
      top.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, W, 300);
      drawLogoAndBadge();

      const introEnd = descStart + Math.min(5.5, D * 0.45);
      if (t < introEnd + 0.4) {
        drawIntroPanel(1 - ease((t - introEnd) / 0.4));
      }
      // current spoken caption (cross-faded)
      const tt = Math.max(t, descStart);
      let ci = 0;
      for (let i = 0; i < captions.length; i++) if (tt >= capTimes[i]) ci = i;
      if (t >= introEnd) {
        const within = tt - capTimes[ci];
        const alpha = ease(Math.min(1, (t - introEnd) / 0.4)) * ease(Math.min(1, within / 0.3));
        drawCaptionPanel(captions[ci], alpha);
      }
      if (t > closeStart - 0.7) {
        ctx.fillStyle = `rgba(20,0,6,${ease((t - (closeStart - 0.7)) / 0.4)})`;
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      drawClosingBackground(t);
      const fadeIn = ease((t - (closeStart - 0.3)) / 0.5);
      if (t < companyUntil) {
        drawCompanyCard(fadeIn * (1 - ease((t - (companyUntil - 0.5)) / 0.5)));
      } else {
        drawContactCard(ease((t - companyUntil) / 0.5));
      }
      // overall fade-out at the very end
      const fadeOut = ease((t - (total - 0.7)) / 0.7);
      if (fadeOut > 0) {
        ctx.fillStyle = `rgba(0,0,0,${fadeOut})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }

  // ---- run
  drawFrame(0);
  recorder.start(1000);
  progress(0.05, "Recording the video - keep this tab open...");

  // If the tab goes to the background, the browser pauses drawing while the
  // audio clock keeps running, which would leave a frozen stretch of video.
  let stalled = false;
  let lastTick = 0;

  await new Promise<void>((resolve, reject) => {
    let raf = 0;
    const tick = () => {
      if (opts.signal?.aborted) {
        cancelAnimationFrame(raf);
        reject(new DOMException("Cancelled", "AbortError"));
        return;
      }
      const now = performance.now();
      if (lastTick && now - lastTick > 1500) stalled = true;
      lastTick = now;
      const t = audioCtx.currentTime - startAt;
      drawFrame(Math.max(0, t));
      progress(Math.min(0.97, 0.05 + 0.92 * (t / total)), "Recording the video - keep this tab open...");
      if (t >= total) {
        resolve();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }).catch((e) => {
    if (recorder.state !== "inactive") recorder.stop();
    audioCtx.close().catch(() => {});
    throw e;
  });

  const blob = await new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mime || "video/webm" }));
    recorder.stop();
  });
  stream.getTracks().forEach((t) => t.stop());
  await audioCtx.close().catch(() => {});

  const tryAgain = "Please click Create Video again and keep this tab in front until it finishes.";
  if (stalled) {
    throw new Error(`The tab was in the background for a moment, so part of the video would have frozen. ${tryAgain}`);
  }
  if (!(await hasPicture(blob))) {
    throw new Error(`The recording came out without a picture (this can happen if the browser was busy). ${tryAgain}`);
  }
  progress(1, "Done");

  return { blob, extension: (recorder.mimeType || mime).includes("mp4") ? "mp4" : "webm", seconds: total, hasVoice };
}
