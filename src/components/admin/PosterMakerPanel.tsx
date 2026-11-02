"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Download, ImagePlus, RotateCcw, X } from "lucide-react";
import { POSTING_TIPS, checkAdText } from "@/lib/socialPresets";
import {
  POSTER_DEFAULTS,
  POSTER_FONTS,
  POSTER_LAYOUTS,
  POSTER_LIMITS,
  POSTER_SCHEMES,
  POSTER_SIZES,
  drawPoster,
  type PosterColors,
  type PosterConfig,
  type PosterFontId,
  type PosterSizeId,
} from "@/lib/posterMaker";

interface Picture {
  id: string;
  name: string;
  bitmap: ImageBitmap;
  thumb: string;
}

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-4 font-heading text-sm font-extrabold uppercase tracking-wide text-ink">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "ad";
}

const COLOR_FIELDS: { key: keyof PosterColors; label: string }[] = [
  { key: "primary", label: "Main color" },
  { key: "background", label: "Background" },
  { key: "text", label: "Text" },
  { key: "accent", label: "Accent" },
];

/** A general poster / picture ad maker. Everything is drawn in this browser;
 *  the pictures are never uploaded anywhere. */
export function PosterMakerPanel() {
  const [cfg, setCfg] = useState<PosterConfig>(POSTER_DEFAULTS);
  const [schemeId, setSchemeId] = useState<string>(POSTER_SCHEMES[0].id);
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const picturesRef = useRef<Picture[]>([]);
  picturesRef.current = pictures;

  const set = <K extends keyof PosterConfig>(key: K, value: PosterConfig[K]) => setCfg((c) => ({ ...c, [key]: value }));

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLogo(img);
    img.src = "/images/logo.png";
  }, []);

  useEffect(
    () => () => {
      picturesRef.current.forEach((p) => {
        p.bitmap.close();
        URL.revokeObjectURL(p.thumb);
      });
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawPoster(canvas, cfg, pictures.map((p) => p.bitmap), logo);
  }, [cfg, pictures, logo]);

  async function addPictures(list: FileList | null) {
    if (!list || list.length === 0) return;
    setPictureError(null);
    const problems: string[] = [];
    const added: Picture[] = [];
    for (const file of Array.from(list)) {
      if (pictures.length + added.length >= POSTER_LIMITS.pictures) {
        problems.push(`Only ${POSTER_LIMITS.pictures} pictures can be used in one poster.`);
        break;
      }
      if (!file.type.startsWith("image/")) {
        problems.push(`"${file.name}" is not a picture.`);
        continue;
      }
      if (file.size > POSTER_LIMITS.pictureBytes) {
        problems.push(`"${file.name}" is bigger than ${POSTER_LIMITS.pictureBytes / 1024 / 1024} MB.`);
        continue;
      }
      try {
        const bitmap = await createImageBitmap(file);
        added.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          bitmap,
          thumb: URL.createObjectURL(file),
        });
      } catch {
        problems.push(`"${file.name}" could not be read - please use a JPG or PNG picture.`);
      }
    }
    if (added.length) setPictures((p) => [...p, ...added]);
    if (problems.length) setPictureError(problems.join(" "));
  }

  function removePicture(id: string) {
    setPictures((all) => {
      const gone = all.find((p) => p.id === id);
      if (gone) {
        gone.bitmap.close();
        URL.revokeObjectURL(gone.thumb);
      }
      return all.filter((p) => p.id !== id);
    });
  }

  function movePicture(id: string, by: -1 | 1) {
    setPictures((all) => {
      const i = all.findIndex((p) => p.id === id);
      const j = i + by;
      if (i < 0 || j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function pickScheme(id: string) {
    const s = POSTER_SCHEMES.find((x) => x.id === id);
    if (!s) return;
    setSchemeId(id);
    set("colors", s.colors);
  }

  function setColor(key: keyof PosterColors, value: string) {
    setSchemeId("custom");
    setCfg((c) => ({ ...c, colors: { ...c.colors, [key]: value } }));
  }

  function reset() {
    setCfg(POSTER_DEFAULTS);
    setSchemeId(POSTER_SCHEMES[0].id);
  }

  function download(type: "image/png" | "image/jpeg") {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slug(cfg.headline)}-${cfg.size}.${type === "image/png" ? "png" : "jpg"}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      },
      type,
      0.92,
    );
  }

  const size = POSTER_SIZES[cfg.size];
  const textWarnings = checkAdText([cfg.badge, cfg.headline, cfg.subline, cfg.details, cfg.highlight, cfg.cta, cfg.extra]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="space-y-5">
        <Section title="1. Size and style">
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Where will you use it?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(POSTER_SIZES) as PosterSizeId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => set("size", id)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                    cfg.size === id ? "border-primary bg-primary/5 text-primary" : "border-border text-ink hover:border-primary/50"
                  }`}
                >
                  <span className="block text-sm font-bold">{POSTER_SIZES[id].label}</span>
                  <span className="text-muted">{POSTER_SIZES[id].hint}</span>
                </button>
              ))}
            </div>
          </div>
          {cfg.size === "story" && (
            <label className="flex items-start gap-2 text-sm font-medium text-ink">
              <input type="checkbox" checked={cfg.safeZones} onChange={(e) => set("safeZones", e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
              <span>
                Keep words clear of the app buttons (recommended)
                <span className="block text-xs font-normal text-muted">Instagram, Facebook, TikTok and WhatsApp cover the top and bottom of a story.</span>
              </span>
            </label>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Layout</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {POSTER_LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => set("layout", l.id)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                    cfg.layout === l.id ? "border-primary bg-primary/5 text-primary" : "border-border text-ink hover:border-primary/50"
                  }`}
                >
                  <span className="block text-sm font-bold">{l.label}</span>
                  <span className="text-muted">{l.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="2. What the ad says">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tag (small label)" hint="e.g. FOR SALE, NEW, OFFER">
              <input className={inputClass} maxLength={POSTER_LIMITS.badge} value={cfg.badge} onChange={(e) => set("badge", e.target.value)} />
            </Field>
            <Field label="Price / big highlight" hint="e.g. PKR 2.5 Crore, 20% OFF">
              <input className={inputClass} maxLength={POSTER_LIMITS.highlight} value={cfg.highlight} onChange={(e) => set("highlight", e.target.value)} />
            </Field>
          </div>
          <Field label="Headline">
            <input className={inputClass} maxLength={POSTER_LIMITS.headline} value={cfg.headline} onChange={(e) => set("headline", e.target.value)} />
          </Field>
          <Field label="Sub-headline">
            <input className={inputClass} maxLength={POSTER_LIMITS.subline} value={cfg.subline} onChange={(e) => set("subline", e.target.value)} />
          </Field>
          <Field label="Details" hint={`One point per line (up to ${POSTER_LIMITS.details}). English or Urdu.`}>
            <textarea
              className={`${inputClass} min-h-28`}
              rows={5}
              value={cfg.details}
              onChange={(e) => set("details", e.target.value.split("\n").slice(0, POSTER_LIMITS.details).map((l) => l.slice(0, POSTER_LIMITS.detailLength)).join("\n"))}
            />
          </Field>
          <Field label="Call to action" hint="e.g. Call today for a free visit">
            <input className={inputClass} maxLength={POSTER_LIMITS.cta} value={cfg.cta} onChange={(e) => set("cta", e.target.value)} />
          </Field>
          <Field label="Small extra line (optional)" hint="e.g. Terms apply, offer valid till 30 Nov">
            <input className={inputClass} maxLength={POSTER_LIMITS.extra} value={cfg.extra} onChange={(e) => set("extra", e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={cfg.showContact} onChange={(e) => set("showContact", e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
              Show company phone, website and address
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={cfg.showLogo} onChange={(e) => set("showLogo", e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
              Show company logo
            </label>
          </div>
        </Section>

        <Section title="3. Pictures">
          <p className="text-sm text-muted">
            Add up to {POSTER_LIMITS.pictures} pictures (JPG or PNG). They stay on this computer. With no picture the ad uses a colour background.
          </p>
          {pictureError && (
            <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {pictureError}
            </div>
          )}
          {pictures.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {pictures.map((p, i) => (
                <li key={p.id} className="overflow-hidden rounded-xl border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumb} alt={p.name} className="aspect-square w-full object-cover" />
                  <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                    <span className="text-xs font-semibold text-muted">#{i + 1}</span>
                    <span className="flex gap-1">
                      <button type="button" onClick={() => movePicture(p.id, -1)} disabled={i === 0} className="rounded p-1 text-muted hover:text-ink disabled:opacity-30" aria-label="Move earlier">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => movePicture(p.id, 1)} disabled={i === pictures.length - 1} className="rounded p-1 text-muted hover:text-ink disabled:opacity-30" aria-label="Move later">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => removePicture(p.id)} className="rounded p-1 text-muted hover:text-primary" aria-label="Remove picture">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pictures.length < POSTER_LIMITS.pictures && (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-6 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary">
              <ImagePlus className="h-5 w-5" /> Add pictures
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  void addPictures(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={cfg.rounded} onChange={(e) => set("rounded", e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            Rounded picture corners
          </label>
        </Section>

        <Section title="4. Colors and font">
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Color scheme</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {POSTER_SCHEMES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickScheme(s.id)}
                  className={`rounded-xl border p-2 text-left transition-colors ${schemeId === s.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}
                >
                  <span className="flex h-8 overflow-hidden rounded-md border border-border">
                    {([s.colors.background, s.colors.primary, s.colors.accent, s.colors.text] as const).map((col, i) => (
                      <span key={i} className="flex-1" style={{ background: col }} />
                    ))}
                  </span>
                  <span className="mt-1.5 block text-xs font-semibold text-ink">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">
              Or choose your own colors {schemeId === "custom" && <span className="font-normal text-primary">(custom)</span>}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {COLOR_FIELDS.map((f) => (
                <label key={f.key} className="flex flex-col gap-1.5 text-xs font-semibold text-ink">
                  {f.label}
                  <input
                    type="color"
                    value={cfg.colors[f.key]}
                    onChange={(e) => setColor(f.key, e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-lg border border-border bg-surface p-1"
                  />
                </label>
              ))}
            </div>
          </div>
          <Field label="Font style">
            <select className={inputClass} value={cfg.font} onChange={(e) => set("font", e.target.value as PosterFontId)}>
              {(Object.keys(POSTER_FONTS) as PosterFontId[]).map((id) => (
                <option key={id} value={id}>
                  {POSTER_FONTS[id].label}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="5. Before you post">
          {textWarnings.length > 0 ? (
            <ul className="space-y-2">
              {textWarnings.map((w) => (
                <li key={w.text} className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>&quot;{w.text}&quot;</strong> - {w.why}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> No risky words found in your poster text.
            </p>
          )}
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
            {POSTING_TIPS.filter((tip) => !tip.includes("vertical video")).map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </Section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-extrabold uppercase tracking-wide text-ink">Preview</h2>
            <span className="text-xs text-muted">
              {size.w} x {size.h} px
            </span>
          </div>
          <div className="mt-3 flex justify-center overflow-hidden rounded-xl bg-surface-muted p-2">
            <canvas ref={canvasRef} className="h-auto max-h-[70vh] w-auto max-w-full rounded-lg shadow-md" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => download("image/png")}
              className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover"
            >
              <Download className="h-4 w-4" /> Download PNG
            </button>
            <button
              type="button"
              onClick={() => download("image/jpeg")}
              className="flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary"
            >
              <Download className="h-4 w-4" /> Download JPG
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-muted">JPG is smaller and better for WhatsApp.</p>
          <button type="button" onClick={reset} className="mx-auto mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary">
            <RotateCcw className="h-3.5 w-3.5" /> Start again
          </button>
        </div>
      </aside>
    </div>
  );
}
