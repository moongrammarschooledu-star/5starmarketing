"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Download, Film, Loader2, Pause, Play, Upload, X } from "lucide-react";
import { POSTER_FONTS, POSTER_SCHEMES, type PosterColors, type PosterFontId } from "@/lib/posterMaker";
import { POSTING_TIPS, checkAdText, checkVideoForPlatforms, type Verdict } from "@/lib/socialPresets";
import {
  VIDEO_DEFAULTS,
  VIDEO_FORMATS,
  VIDEO_LIMITS,
  drawEndCard,
  drawVideoFrame,
  outputSize,
  pickRecorderMime,
  type CornerId,
  type VideoEditConfig,
  type VideoFitId,
  type VideoFormatId,
} from "@/lib/videoEditor";

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

function Choice({ active, onClick, title, hint }: { active: boolean; onClick: () => void; title: string; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
        active ? "border-primary bg-primary/5 text-primary" : "border-border text-ink hover:border-primary/50"
      }`}
    >
      <span className="block text-sm font-bold">{title}</span>
      {hint && <span className="text-muted">{hint}</span>}
    </button>
  );
}

interface Loaded {
  name: string;
  url: string;
  duration: number;
  width: number;
  height: number;
}

type LogoMode = "company" | "custom" | "none";

const CORNERS: { id: CornerId; label: string }[] = [
  { id: "tl", label: "Top left" },
  { id: "tr", label: "Top right" },
  { id: "bl", label: "Bottom left" },
  { id: "br", label: "Bottom right" },
];

const COLOR_FIELDS: { key: keyof PosterColors; label: string }[] = [
  { key: "primary", label: "Main color" },
  { key: "background", label: "Card background" },
  { key: "text", label: "Card text" },
  { key: "accent", label: "Accent" },
];

function fmt(sec: number): string {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** Edit a video for an ad: trim, add a logo, a caption and the company
 *  details, add a contact end card. The video is processed in this browser
 *  (it takes as long as the video itself) and never uploaded. */
export function VideoEditorPanel() {
  const [cfg, setCfg] = useState<VideoEditConfig>(VIDEO_DEFAULTS);
  const [schemeId, setSchemeId] = useState<string>(POSTER_SCHEMES[0].id);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<HTMLImageElement | null>(null);
  const [customLogo, setCustomLogo] = useState<{ img: HTMLImageElement; url: string } | null>(null);
  const [logoMode, setLogoMode] = useState<LogoMode>("company");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; ext: "mp4" | "webm"; verdicts: Verdict[]; seconds: number } | null>(null);
  const [voiceText, setVoiceText] = useState("");
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [voiceLang, setVoiceLang] = useState<"auto" | "en" | "ur">("auto");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelRef = useRef(false);
  const resultUrlRef = useRef<string | null>(null);
  const loadedUrlRef = useRef<string | null>(null);
  const customLogoUrlRef = useRef<string | null>(null);

  const activeLogo = logoMode === "custom" ? customLogo?.img ?? null : logoMode === "company" ? companyLogo : null;
  const effective: VideoEditConfig = { ...cfg, showLogo: logoMode !== "none" };
  const cfgRef = useRef(effective);
  cfgRef.current = effective;
  const logoRef = useRef<HTMLImageElement | null>(null);
  logoRef.current = activeLogo;

  const set = <K extends keyof VideoEditConfig>(key: K, value: VideoEditConfig[K]) => setCfg((c) => ({ ...c, [key]: value }));

  useEffect(() => {
    const img = new Image();
    img.onload = () => setCompanyLogo(img);
    img.src = "/images/logo.png";
  }, []);

  useEffect(
    () => () => {
      cancelRef.current = true;
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      if (loadedUrlRef.current) URL.revokeObjectURL(loadedUrlRef.current);
      if (customLogoUrlRef.current) URL.revokeObjectURL(customLogoUrlRef.current);
    },
    [],
  );

  const render = useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || !v.videoWidth) return;
    const { w, h } = outputSize(cfgRef.current.format, v.videoWidth, v.videoHeight);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const ctx = c.getContext("2d");
    if (ctx) drawVideoFrame(ctx, v, w, h, cfgRef.current, logoRef.current);
  }, []);

  // redraw the still picture whenever a setting changes
  useEffect(() => {
    if (loaded && !playing) render();
  }, [cfg, logoMode, activeLogo, loaded, playing, render]);

  // keep the preview moving while it plays
  useEffect(() => {
    if (!playing) return;
    const v = videoRef.current;
    if (!v) return;
    let raf = 0;
    const tick = () => {
      render();
      setTime(v.currentTime);
      if (v.currentTime >= cfgRef.current.end - 0.03 || v.ended) {
        v.pause();
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, render]);

  function clearResult() {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setResult(null);
  }

  function chooseVideo(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    setError(null);
    clearResult();
    if (!file.type.startsWith("video/")) return setFileError(`"${file.name}" is not a video file.`);
    if (file.size > VIDEO_LIMITS.fileBytes) return setFileError(`"${file.name}" is bigger than ${VIDEO_LIMITS.fileBytes / 1024 / 1024} MB.`);
    if (loadedUrlRef.current) URL.revokeObjectURL(loadedUrlRef.current);
    const url = URL.createObjectURL(file);
    loadedUrlRef.current = url;
    setPlaying(false);
    setLoaded(null);
    // read the size and length with a throw-away video element
    const probe = document.createElement("video");
    probe.preload = "metadata";
    const finish = () => {
      setLoaded({ name: file.name, url, duration: probe.duration, width: probe.videoWidth, height: probe.videoHeight });
      setCfg((c) => ({ ...c, start: 0, end: Math.floor(probe.duration * 10) / 10 }));
      setTime(0);
    };
    probe.onloadedmetadata = () => {
      if (!probe.videoWidth) {
        setFileError(`"${file.name}" could not be read - please use an MP4 video.`);
        return;
      }
      if (isFinite(probe.duration)) return finish();
      // videos saved by a browser recorder do not say how long they are: jump to the end to find out
      probe.ondurationchange = () => {
        if (isFinite(probe.duration)) {
          probe.ondurationchange = null;
          finish();
        }
      };
      probe.currentTime = 1e9;
    };
    probe.onerror = () => setFileError(`"${file.name}" could not be read - please use an MP4 video.`);
    probe.src = url;
  }

  function chooseLogo(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setFileError(`"${file.name}" is not a picture.`);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (customLogoUrlRef.current) URL.revokeObjectURL(customLogoUrlRef.current);
      customLogoUrlRef.current = url;
      setCustomLogo({ img, url });
      setLogoMode("custom");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setFileError(`"${file.name}" could not be read as a logo picture.`);
    };
    img.src = url;
  }

  function onVideoReady() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(0.05, v.duration / 2);
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v || !loaded) return;
    if (playing) {
      v.pause();
      setPlaying(false);
      return;
    }
    if (v.currentTime < cfg.start || v.currentTime >= cfg.end - 0.1) v.currentTime = cfg.start;
    v.muted = !cfg.keepSound;
    void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  function seek(t: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
    setTime(t);
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

  async function createVideo() {
    if (!loaded) return;
    setError(null);
    clearResult();
    const rec = pickRecorderMime();
    if (!rec || typeof HTMLCanvasElement.prototype.captureStream !== "function") {
      return setError("This browser cannot record video. Please open this page in Google Chrome or Microsoft Edge.");
    }
    const config = cfgRef.current;
    const logo = logoRef.current;
    if (config.end - config.start < 0.5) return setError("The part you chose is too short - please make it at least half a second.");

    videoRef.current?.pause();
    setPlaying(false);
    cancelRef.current = false;
    setBusy(true);
    setProgress(0);
    setStage("Getting ready...");

    const ev = document.createElement("video");
    ev.playsInline = true;
    ev.preload = "auto";
    let actx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let voiceStarter: (() => void) | null = null;
    let producedSeconds = 0;
    try {
      await new Promise<void>((resolve, reject) => {
        ev.onloadeddata = () => resolve();
        ev.onerror = () => reject(new Error("The video could not be opened."));
        ev.src = loaded.url;
      });
      const { w, h } = outputSize(config.format, ev.videoWidth, ev.videoHeight);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not start drawing.");
      stream = canvas.captureStream(30);

      // the voice-over (if any) is made first, so a problem shows before the long recording
      const voiceWords = voiceText.trim();
      let voiceBuf: AudioBuffer | null = null;
      if (voiceWords) {
        setStage("Creating the voice...");
        const res = await fetch("/admin/ads/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: voiceWords, gender: voiceGender, lang: voiceLang === "auto" ? undefined : voiceLang }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
          throw new Error(
            body?.error === "voice_not_configured"
              ? "The voice service is not set up yet. Clear the voice-over words to make the video without a voice."
              : body?.message ?? "The voice could not be created.",
          );
        }
        if (!res.headers.get("content-type")?.startsWith("audio/")) {
          throw new Error("The voice service did not answer. Please sign in again and try once more.");
        }
        actx = new AudioContext();
        await actx.resume();
        voiceBuf = await actx.decodeAudioData(await res.arrayBuffer());
      }

      if (config.keepSound || voiceBuf) {
        try {
          if (!actx) {
            actx = new AudioContext();
            await actx.resume();
          }
          const dest = actx.createMediaStreamDestination();
          if (config.keepSound) {
            const src = actx.createMediaElementSource(ev);
            const gain = actx.createGain();
            gain.gain.value = voiceBuf ? 0.25 : 1; // the video's own sound goes quiet while the voice speaks
            src.connect(gain);
            gain.connect(dest);
          } else {
            ev.muted = true;
          }
          if (voiceBuf) {
            const vs = actx.createBufferSource();
            vs.buffer = voiceBuf;
            vs.connect(dest);
            voiceStarter = () => vs.start();
          }
          dest.stream.getAudioTracks().forEach((t) => stream!.addTrack(t));
        } catch {
          // no sound track available - the video is still made, without sound
        }
      } else {
        ev.muted = true;
      }

      await new Promise<void>((resolve) => {
        ev.onseeked = () => resolve();
        ev.currentTime = config.start;
      });
      ev.onseeked = null;
      drawVideoFrame(ctx, ev, w, h, config, logo);

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType: rec.mime, videoBitsPerSecond: 5_000_000 });
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      const span = config.end - config.start;
      const voiceSeconds = voiceBuf ? voiceBuf.duration + 0.3 : 0;
      const mainSeconds = Math.max(span, Math.min(voiceSeconds, span + 60));
      const share = config.endCard ? mainSeconds / (mainSeconds + VIDEO_LIMITS.endCardSeconds) : 1;
      producedSeconds = mainSeconds + (config.endCard ? VIDEO_LIMITS.endCardSeconds : 0);
      setStage("Making your video - please keep this tab open and visible...");
      recorder.start(250);
      voiceStarter?.();
      const mainStart = performance.now();
      await ev.play();
      await new Promise<void>((resolve) => {
        const tick = () => {
          if (cancelRef.current) return resolve();
          const videoDone = ev.ended || ev.currentTime >= config.end - 0.03;
          if (videoDone && !ev.paused) ev.pause(); // the last picture stays while the voice finishes
          drawVideoFrame(ctx, ev, w, h, config, logo);
          const elapsed = (performance.now() - mainStart) / 1000;
          setProgress(Math.min(1, elapsed / mainSeconds) * share);
          if (videoDone && elapsed >= mainSeconds - 0.05) return resolve();
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      ev.pause();

      if (config.endCard && !cancelRef.current) {
        setStage("Adding the contact card...");
        const t0 = performance.now();
        await new Promise<void>((resolve) => {
          const tick = () => {
            if (cancelRef.current) return resolve();
            const t = (performance.now() - t0) / 1000;
            drawEndCard(ctx, w, h, config, logo, Math.min(1, t / 0.5));
            setProgress(share + Math.min(1, t / VIDEO_LIMITS.endCardSeconds) * (1 - share));
            if (t >= VIDEO_LIMITS.endCardSeconds) return resolve();
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      }

      recorder.stop();
      await stopped;
      if (cancelRef.current) {
        setStage("");
        return;
      }
      const blob = new Blob(chunks, { type: rec.mime.split(";")[0] });
      if (blob.size === 0) throw new Error("The recording came out empty. Please try again.");
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      const base = loaded.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "video";
      const verdicts = checkVideoForPlatforms({ shape: config.format, seconds: producedSeconds, bytes: blob.size, isMp4: rec.ext === "mp4" });
      setResult({ url, name: `${base}-ad.${rec.ext}`, ext: rec.ext, verdicts, seconds: producedSeconds });
      setProgress(1);
      setStage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while making the video.");
      setStage("");
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      void actx?.close().catch(() => undefined);
      ev.removeAttribute("src");
      ev.load();
      setBusy(false);
    }
  }

  const textWarnings = checkAdText([cfg.caption, cfg.endCardText, voiceText]);
  const span = Math.max(0, cfg.end - cfg.start);
  const outSeconds = span + (cfg.endCard ? VIDEO_LIMITS.endCardSeconds : 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="space-y-5">
        <Section title="1. Your video">
          {fileError && (
            <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {fileError}
            </div>
          )}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-8 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary">
            <Upload className="h-5 w-5" /> {loaded ? "Choose a different video" : "Choose a video (MP4 works best)"}
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                chooseVideo(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {loaded && (
            <p className="text-xs text-muted">
              {loaded.name} - {loaded.width} x {loaded.height}, {fmt(loaded.duration)}. The video stays on this computer.
            </p>
          )}
        </Section>

        {loaded && (
          <>
            <Section title="2. Cut the video">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`Start: ${fmt(cfg.start)}`}>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, cfg.end - 0.5)}
                    step={0.1}
                    value={cfg.start}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      set("start", v);
                      seek(v);
                    }}
                    className="w-full accent-primary"
                  />
                </Field>
                <Field label={`End: ${fmt(cfg.end)}`}>
                  <input
                    type="range"
                    min={Math.min(loaded.duration, cfg.start + 0.5)}
                    max={loaded.duration}
                    step={0.1}
                    value={cfg.end}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      set("end", v);
                      seek(Math.max(cfg.start, v - 0.2));
                    }}
                    className="w-full accent-primary"
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" checked={cfg.keepSound} onChange={(e) => set("keepSound", e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                Keep the video&apos;s own sound
              </label>
            </Section>

            <Section title="3. Shape">
              <p className="text-sm font-semibold text-ink">Where will you post it?</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(VIDEO_FORMATS) as VideoFormatId[]).map((id) => (
                  <Choice key={id} active={cfg.format === id} onClick={() => set("format", id)} title={VIDEO_FORMATS[id].label} hint={VIDEO_FORMATS[id].hint} />
                ))}
              </div>
              {cfg.format === "vertical" && (
                <label className="flex items-start gap-2 text-sm font-medium text-ink">
                  <input type="checkbox" checked={cfg.safeZones} onChange={(e) => set("safeZones", e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                  <span>
                    Keep words and logo clear of the app buttons (recommended)
                    <span className="block text-xs font-normal text-muted">Instagram, Facebook, TikTok and YouTube cover the top and bottom of a vertical video.</span>
                  </span>
                </label>
              )}
              {cfg.format !== "original" && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["fill", "Fill the screen", "Crops the edges so there are no empty bars"],
                      ["fit", "Show the whole video", "Empty sides are filled with a blurred copy"],
                    ] as [VideoFitId, string, string][]
                  ).map(([id, title, hint]) => (
                    <Choice key={id} active={cfg.fit === id} onClick={() => set("fit", id)} title={title} hint={hint} />
                  ))}
                </div>
              )}
            </Section>

            <Section title="4. Logo, caption and company details">
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Logo</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Choice active={logoMode === "company"} onClick={() => setLogoMode("company")} title="Company logo" hint="5STAR.M logo" />
                  <Choice active={logoMode === "custom"} onClick={() => (customLogo ? setLogoMode("custom") : document.getElementById("video-logo-input")?.click())} title="My own logo" hint={customLogo ? "The logo you added" : "Choose a picture"} />
                  <Choice active={logoMode === "none"} onClick={() => setLogoMode("none")} title="No logo" />
                </div>
                <input id="video-logo-input" type="file" accept="image/*" className="sr-only" onChange={(e) => { chooseLogo(e.target.files?.[0]); e.target.value = ""; }} />
                {customLogo && (
                  <button type="button" onClick={() => document.getElementById("video-logo-input")?.click()} className="mt-2 text-xs font-semibold text-primary hover:underline">
                    Choose another logo picture
                  </button>
                )}
              </div>
              {logoMode !== "none" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Logo place">
                    <select className={inputClass} value={cfg.logoCorner} onChange={(e) => set("logoCorner", e.target.value as CornerId)}>
                      {CORNERS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Logo size">
                    <select className={inputClass} value={cfg.logoSize} onChange={(e) => set("logoSize", e.target.value as VideoEditConfig["logoSize"])}>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </Field>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <Field label="Caption on the video (optional)" hint="e.g. 5 Marla House for Sale - Johar Town">
                  <input className={inputClass} maxLength={VIDEO_LIMITS.caption} value={cfg.caption} onChange={(e) => set("caption", e.target.value)} />
                </Field>
                <Field label="Caption place">
                  <select className={inputClass} value={cfg.captionPosition} onChange={(e) => set("captionPosition", e.target.value as VideoEditConfig["captionPosition"])}>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" checked={cfg.showDetails} onChange={(e) => set("showDetails", e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                Show company phone, website and address at the bottom
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" checked={cfg.endCard} onChange={(e) => set("endCard", e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                Add a {VIDEO_LIMITS.endCardSeconds}-second contact card at the end
              </label>
              {cfg.endCard && (
                <Field label="Words on the contact card">
                  <input className={inputClass} maxLength={VIDEO_LIMITS.endCardText} value={cfg.endCardText} onChange={(e) => set("endCardText", e.target.value)} />
                </Field>
              )}
            </Section>

            <Section title="5. Voice-over (optional)">
              <Field label="What the voice should say" hint="Leave empty for no voice. English or Urdu. The video's own sound goes quiet while the voice speaks.">
                <textarea className={`${inputClass} min-h-24`} rows={4} maxLength={700} value={voiceText} onChange={(e) => setVoiceText(e.target.value)} disabled={busy} />
              </Field>
              {voiceText.trim() && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Voice">
                    <select className={inputClass} value={voiceGender} onChange={(e) => setVoiceGender(e.target.value as "female" | "male")} disabled={busy}>
                      <option value="female">Female voice</option>
                      <option value="male">Male voice</option>
                    </select>
                  </Field>
                  <Field label="Language">
                    <select className={inputClass} value={voiceLang} onChange={(e) => setVoiceLang(e.target.value as "auto" | "en" | "ur")} disabled={busy}>
                      <option value="auto">Auto (from the words)</option>
                      <option value="en">English</option>
                      <option value="ur">اردو</option>
                    </select>
                  </Field>
                </div>
              )}
            </Section>

            <Section title="6. Colors and font">
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {COLOR_FIELDS.map((f) => (
                  <label key={f.key} className="flex flex-col gap-1.5 text-xs font-semibold text-ink">
                    {f.label}
                    <input type="color" value={cfg.colors[f.key]} onChange={(e) => setColor(f.key, e.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-border bg-surface p-1" />
                  </label>
                ))}
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

            <Section title="7. Before you post">
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
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> No risky words found in your caption or voice-over.
                </p>
              )}
              {cfg.keepSound && !voiceText.trim() && (
                <p className="text-xs text-muted">If your video has a song you do not own, Instagram, Facebook or TikTok may mute or block it. Switch off &quot;Keep the video&apos;s own sound&quot; to be safe.</p>
              )}
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
                {POSTING_TIPS.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </Section>
          </>
        )}
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-heading text-sm font-extrabold uppercase tracking-wide text-ink">Preview</h2>
          <video
            ref={videoRef}
            src={loaded?.url}
            preload="auto"
            playsInline
            onLoadedData={onVideoReady}
            onSeeked={() => {
              if (!playing) render();
            }}
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
          />
          <div className="mt-3 flex min-h-48 items-center justify-center overflow-hidden rounded-xl bg-surface-muted p-2">
            {loaded ? (
              <canvas ref={canvasRef} className="h-auto max-h-[60vh] w-auto max-w-full rounded-lg shadow-md" />
            ) : (
              <p className="flex items-center gap-2 px-4 py-10 text-center text-sm text-muted">
                <Film className="h-5 w-5" /> Choose a video to see it here.
              </p>
            )}
          </div>

          {loaded && (
            <>
              <div className="mt-3 flex items-center gap-3">
                <button type="button" onClick={togglePlay} disabled={busy} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50" aria-label={playing ? "Pause" : "Play"}>
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <input
                  type="range"
                  min={cfg.start}
                  max={Math.max(cfg.start + 0.1, cfg.end)}
                  step={0.05}
                  value={Math.min(Math.max(time, cfg.start), cfg.end)}
                  onChange={(e) => seek(Number(e.target.value))}
                  disabled={busy}
                  className="w-full accent-primary"
                  aria-label="Move through the video"
                />
                <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted">
                  {fmt(Math.max(0, time - cfg.start))} / {fmt(span)}
                </span>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              {busy ? (
                <div className="mt-4 space-y-2">
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
                  </div>
                  <p className="flex items-center gap-2 text-xs font-semibold text-ink">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> {stage} {Math.round(progress * 100)}%
                  </p>
                  <button type="button" onClick={() => (cancelRef.current = true)} className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary">
                    <X className="h-3.5 w-3.5" /> Stop
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void createVideo()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover"
                >
                  <Film className="h-4 w-4" /> Make the video
                </button>
              )}
              <p className="mt-2 text-center text-xs text-muted">
                It takes about {fmt(outSeconds)} to make. Keep this page open and in front until it finishes.
              </p>

              {result && (
                <div className="mt-4 space-y-3 rounded-xl border border-border p-3">
                  <p className="flex items-center gap-2 text-sm font-bold text-ink">
                    <CheckCircle2 className="h-4 w-4 text-green-600" /> Your video is ready
                  </p>
                  <video src={result.url} controls playsInline className="max-h-[50vh] w-full rounded-lg bg-black" />
                  <a href={result.url} download={result.name} className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
                    <Download className="h-4 w-4" /> Download {result.ext.toUpperCase()}
                  </a>
                  <div>
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink">Checked for</p>
                    <ul className="grid gap-1 sm:grid-cols-2">
                      {result.verdicts.map((v) => (
                        <li key={v.name} className={`flex items-start gap-1.5 text-xs ${v.ok ? "text-ink" : "text-amber-800"}`}>
                          {v.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                          <span>
                            {v.name}
                            {v.note ? ` - ${v.note}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {result.ext === "webm" && (
                    <p className="text-xs text-muted">This browser saves WebM. For WhatsApp or an iPhone, open this page in the latest Google Chrome to get an MP4.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
