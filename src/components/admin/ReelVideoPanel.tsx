"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Clapperboard, Download, Loader2 } from "lucide-react";
import { createReelVideo, type ReelData } from "@/lib/reelVideo";
import { useToast } from "./ToastProvider";

type Lang = "auto" | "en" | "ur";

// The video is drawn and recorded right here in the browser (nothing heavy
// runs on the server). Only the narration audio comes from the server, and
// only if a voice service has been configured - without one the video is
// still made, with captions and music but no voice.
export function ReelVideoPanel({ brochureId }: { brochureId: string }) {
  const [lang, setLang] = useState<Lang>("auto");
  const [voice, setVoice] = useState(true);
  const [music, setMusic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fraction, setFraction] = useState(0);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; seconds: number; hasVoice: boolean } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);
  const toast = useToast();

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  async function create() {
    setError(null);
    setNote(null);
    setResult(null);
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setFraction(0);
    setLabel("Loading the property details...");

    try {
      const langQuery = lang === "auto" ? "" : `?lang=${lang}`;
      const dataRes = await fetch(`/admin/brochures/reel-data/${brochureId}${langQuery}`, { cache: "no-store", signal: controller.signal });
      if (!dataRes.ok) throw new Error((await dataRes.json().catch(() => null))?.error ?? "Could not load this brochure's details.");
      const data = (await dataRes.json()) as ReelData;

      let description: ArrayBuffer | null = null;
      let closing: ArrayBuffer | null = null;
      if (voice) {
        setLabel("Creating the female voice...");
        // Both parts are requested at once - each takes several seconds.
        const results = await Promise.all(
          (["description", "closing"] as const).map(async (part) => {
            const res = await fetch(`/admin/brochures/narration/${brochureId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ part, lang: lang === "auto" ? undefined : lang }),
              signal: controller.signal,
            });
            return res.ok ? { audio: await res.arrayBuffer() } : { failure: await res.json().catch(() => null) };
          })
        );
        const failed = results.find((r) => "failure" in r);
        if (failed && "failure" in failed) {
          const body = failed.failure;
          setNote(
            body?.error === "voice_not_configured"
              ? "The voice service is not set up yet, so this video has captions and music but no spoken voice."
              : `${body?.message ?? "The voice could not be created."} The video was made without a voice.`
          );
        } else {
          description = (results[0] as { audio: ArrayBuffer }).audio;
          closing = (results[1] as { audio: ArrayBuffer }).audio;
        }
      }

      const out = await createReelVideo({
        data,
        description,
        closing,
        music,
        signal: controller.signal,
        onProgress: (f, l) => {
          setFraction(f);
          setLabel(l);
        },
      });

      const url = URL.createObjectURL(out.blob);
      urlRef.current = url;
      setResult({ url, name: `5STAR-M-${data.slug}-reel.${out.extension}`, seconds: out.seconds, hasVoice: out.hasVoice });
      toast.show("Video created.");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setNote("Video creation was cancelled.");
      } else {
        setError(e instanceof Error ? e.message : "Could not create the video.");
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2">
        <Clapperboard className="h-4.5 w-4.5 text-primary" />
        <h2 className="font-heading text-sm font-bold text-ink">Reel / Story Video (9:16)</h2>
      </div>
      <p className="mt-1 text-xs text-muted">
        Makes a vertical video for Facebook Reels and Stories: photos, the property details, the company and contact details, with an
        optional female voice and light background music. It is recorded live in this browser, so keep this tab open until it finishes.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <label className="flex items-center gap-2 font-semibold text-ink">
          Voice language
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            disabled={busy || !voice}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-ink outline-none focus:border-primary disabled:opacity-50"
          >
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
          onClick={create}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clapperboard className="h-3.5 w-3.5" />}
          {busy ? "Creating..." : result ? "Create Again" : "Create Video"}
        </button>
        {busy && (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="rounded-full border-2 border-ink/15 px-4 py-2.5 text-xs font-bold text-ink hover:border-primary hover:text-primary"
          >
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

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs font-semibold text-primary">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
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
            <a
              href={result.url}
              download={result.name}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-success/40 px-4 py-2.5 text-xs font-bold text-success hover:bg-success/5"
            >
              <Download className="h-3.5 w-3.5" /> Download Video
            </a>
            <p className="mt-3 text-xs text-muted">Upload this file on Facebook as a Reel or a Story. Preview it first - you can create it again with different options.</p>
          </div>
        </div>
      )}
    </div>
  );
}
