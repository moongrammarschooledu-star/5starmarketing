"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, Clapperboard, Download, ImagePlus, Loader2, X } from "lucide-react";
import { createReelVideo, type ReelData } from "@/lib/reelVideo";
import { AD_LIMITS } from "@/lib/adMaker";

type Lang = "auto" | "en" | "ur";
interface Picture {
  id: string;
  file: File;
  url: string;
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

/** Makes a company ad video (9:16) from pictures the admin uploads and a
 *  description the admin writes; a female voice reads that description and,
 *  at the end, the company's contact details. Everything is drawn in this
 *  browser - the pictures never leave the computer. */
export function AdMakerPanel() {
  const [headline, setHeadline] = useState("");
  const [subline, setSubline] = useState("");
  const [badge, setBadge] = useState("");
  const [highlight, setHighlight] = useState("");
  const [description, setDescription] = useState("");
  const [lang, setLang] = useState<Lang>("auto");
  const [voice, setVoice] = useState(true);
  const [music, setMusic] = useState(true);
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [pictureError, setPictureError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [fraction, setFraction] = useState(0);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; seconds: number; hasVoice: boolean } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const picturesRef = useRef<Picture[]>([]);
  picturesRef.current = pictures;

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      picturesRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    },
    []
  );

  async function addPictures(list: FileList | null) {
    if (!list || list.length === 0) return;
    setPictureError(null);
    const problems: string[] = [];
    const added: Picture[] = [];
    for (const file of Array.from(list)) {
      if (pictures.length + added.length >= AD_LIMITS.pictures) {
        problems.push(`Only ${AD_LIMITS.pictures} pictures can be used in one ad.`);
        break;
      }
      if (!file.type.startsWith("image/")) {
        problems.push(`"${file.name}" is not a picture.`);
        continue;
      }
      if (file.size > AD_LIMITS.pictureBytes) {
        problems.push(`"${file.name}" is bigger than ${AD_LIMITS.pictureBytes / 1024 / 1024} MB.`);
        continue;
      }
      try {
        // Make sure the browser can really read it (some phone formats such as HEIC cannot be).
        (await createImageBitmap(file)).close();
      } catch {
        problems.push(`"${file.name}" could not be read - please use a JPG or PNG picture.`);
        continue;
      }
      added.push({ id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`, file, url: URL.createObjectURL(file) });
    }
    if (added.length) setPictures((p) => [...p, ...added]);
    if (problems.length) setPictureError(problems.join(" "));
  }

  function removePicture(id: string) {
    setPictures((all) => {
      const gone = all.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
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

  async function create() {
    setError(null);
    setNote(null);
    if (!headline.trim()) return setError("Please write a headline for the ad.");
    if (description.trim().length < AD_LIMITS.descriptionMin) return setError("Please write a description - the voice reads it.");
    if (pictures.length === 0) return setError("Please add at least one picture.");

    setResult(null);
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setFraction(0);
    setLabel("Preparing the ad...");

    const text = { headline, subline, badge, highlight, description, lang: lang === "auto" ? undefined : lang };
    const post = (path: string, extra: object = {}) =>
      fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...text, ...extra }), signal: controller.signal });

    try {
      const prep = await post("/admin/ads/prepare");
      if (!prep.ok) throw new Error((await prep.json().catch(() => null))?.error ?? "Could not prepare the ad.");
      const data = (await prep.json()) as ReelData;

      let descriptionAudio: ArrayBuffer | null = null;
      let closingAudio: ArrayBuffer | null = null;
      if (voice) {
        setLabel("Creating the female voice...");
        const results = await Promise.all(
          (["description", "closing"] as const).map(async (part) => {
            const res = await post("/admin/ads/voice", { part });
            return res.ok ? { audio: await res.arrayBuffer() } : { failure: await res.json().catch(() => null) };
          })
        );
        const failed = results.find((r) => "failure" in r);
        if (failed && "failure" in failed) {
          const body = failed.failure;
          setNote(
            body?.error === "voice_not_configured"
              ? "The voice service is not set up, so this ad has captions and music but no spoken voice."
              : `${body?.message ?? "The voice could not be created."} The ad was made without a voice.`
          );
        } else {
          descriptionAudio = (results[0] as { audio: ArrayBuffer }).audio;
          closingAudio = (results[1] as { audio: ArrayBuffer }).audio;
        }
      }

      const out = await createReelVideo({
        data: { ...data, images: pictures.map((p) => p.file) },
        description: descriptionAudio,
        closing: closingAudio,
        music,
        signal: controller.signal,
        onProgress: (f, l) => {
          setFraction(f);
          setLabel(l);
        },
      });

      const url = URL.createObjectURL(out.blob);
      resultUrlRef.current = url;
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      setResult({ url, name: `5STAR-M-ad-${stamp}.${out.extension}`, seconds: out.seconds, hasVoice: out.hasVoice });
      if (out.pictureUnverified) {
        setNote("The automatic check could not confirm the picture. Play the video below - if you can see the pictures it is fine; if it is blank, click Create Ad again.");
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") setNote("Ad creation was cancelled.");
      else setError(e instanceof Error ? e.message : "Could not create the ad.");
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  const remaining = AD_LIMITS.descriptionMax - description.length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">1. Pictures</h2>
        <p className="mt-1 text-xs text-muted">
          Up to {AD_LIMITS.pictures} pictures (JPG or PNG). They are shown one after another, in this order, with a slow zoom. They stay on your computer - nothing is uploaded.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {pictures.map((p, i) => (
            <div key={p.id} className="relative overflow-hidden rounded-xl border border-border bg-surface-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Picture ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-bold text-white">{i + 1}</span>
              <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between">
                <div className="flex gap-1">
                  <button type="button" onClick={() => movePicture(p.id, -1)} disabled={i === 0 || busy} aria-label="Move earlier" className="rounded-full bg-ink/80 p-1 text-white disabled:opacity-30">
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => movePicture(p.id, 1)} disabled={i === pictures.length - 1 || busy} aria-label="Move later" className="rounded-full bg-ink/80 p-1 text-white disabled:opacity-30">
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
                <button type="button" onClick={() => removePicture(p.id)} disabled={busy} aria-label="Remove picture" className="rounded-full bg-primary p-1 text-white disabled:opacity-30">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {pictures.length < AD_LIMITS.pictures && (
            <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-xs font-semibold text-muted hover:border-primary hover:text-primary">
              <ImagePlus className="h-5 w-5" />
              Add pictures
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={busy}
                className="sr-only"
                onChange={(e) => {
                  void addPictures(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
        {pictureError && <p className="mt-3 text-xs font-semibold text-primary">{pictureError}</p>}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">2. What the ad says</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Headline *" hint="Shown big at the start, and spoken first.">
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={AD_LIMITS.headline} placeholder="e.g. Your dream home in Lahore" className={inputClass} disabled={busy} />
            </Field>
          </div>
          <Field label="Line under the headline" hint="Optional - area, tagline...">
            <input value={subline} onChange={(e) => setSubline(e.target.value)} maxLength={AD_LIMITS.subline} placeholder="e.g. Johar Town, Lahore" className={inputClass} disabled={busy} />
          </Field>
          <Field label="Badge" hint="Optional - a small red tag at the top.">
            <input value={badge} onChange={(e) => setBadge(e.target.value)} maxLength={AD_LIMITS.badge} placeholder="e.g. NEW, LIMITED OFFER" className={inputClass} disabled={busy} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Highlighted offer or price" hint="Optional - shown in a red box.">
              <input value={highlight} onChange={(e) => setHighlight(e.target.value)} maxLength={AD_LIMITS.highlight} placeholder="e.g. Plots from 25 Lac" className={inputClass} disabled={busy} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description *" hint={`The voice reads exactly this, and it appears as captions. Write Urdu in Urdu script or write in English (Roman Urdu is read with an English voice). ${remaining} characters left.`}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={AD_LIMITS.descriptionMax}
                rows={7}
                disabled={busy}
                placeholder="Write what you want the ad to say, in short sentences."
                className={`${inputClass} resize-y`}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">3. Make the video</h2>
        <p className="mt-1 text-xs text-muted">
          A vertical video for Facebook Reels and Stories: your pictures and text, then the company and contact details at the end. It is made right here in your browser, so keep this tab open until it finishes.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label className="flex items-center gap-2 font-semibold text-ink">
            Voice language
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} disabled={busy || !voice} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-ink outline-none focus:border-primary disabled:opacity-50">
              <option value="auto">Auto (from the description)</option>
              <option value="en">English</option>
              <option value="ur">اردو</option>
            </select>
          </label>
          <label className="flex items-center gap-2 font-semibold text-ink">
            <input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} disabled={busy} className="h-4 w-4 rounded border-border text-primary" />
            Female voice
          </label>
          <label className="flex items-center gap-2 font-semibold text-ink">
            <input type="checkbox" checked={music} onChange={(e) => setMusic(e.target.checked)} disabled={busy} className="h-4 w-4 rounded border-border text-primary" />
            Background music
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void create()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clapperboard className="h-3.5 w-3.5" />}
            {busy ? "Creating..." : result ? "Create Ad Again" : "Create Ad"}
          </button>
          {busy && (
            <button type="button" onClick={() => abortRef.current?.abort()} className="rounded-full border-2 border-ink/15 px-4 py-2.5 text-xs font-bold text-ink hover:border-primary hover:text-primary">
              Cancel
            </button>
          )}
        </div>

        {busy && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.round(fraction * 100)}%` }} />
            </div>
            <p className="mt-1.5 text-xs font-semibold text-muted">
              {label} ({Math.round(fraction * 100)}%)
            </p>
          </div>
        )}

        {note && <p className="mt-3 rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-xs font-semibold text-muted">{note}</p>}

        {result && (
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-[260px_1fr]">
            <video src={result.url} controls playsInline className="aspect-[9/16] w-full max-w-[260px] rounded-xl border border-border bg-ink" />
            <div className="text-sm">
              <p className="font-semibold text-ink">
                Ready - {Math.round(result.seconds)} seconds{result.hasVoice ? " with voice" : ", no voice"}.
              </p>
              <a href={result.url} download={result.name} className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-success/40 px-4 py-2.5 text-xs font-bold text-success hover:bg-success/5">
                <Download className="h-3.5 w-3.5" /> Download Video
              </a>
              <p className="mt-3 text-xs text-muted">Upload this file on Facebook as a Reel or a Story. Preview it first - you can change the text or pictures and create it again. The video is not saved on the website, so download it.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
