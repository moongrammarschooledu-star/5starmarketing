"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { DEFAULT_MUSIC_STYLE, MUSIC_STYLES, scheduleMusic, type MusicStyle } from "@/lib/reelMusic";

const KEY = "5star-reel-music-style-v1";
const PREVIEW_SECONDS = 14;

/** The chosen background music style, remembered in this browser. */
export function useMusicStyle(): [MusicStyle, (s: MusicStyle) => void] {
  const [style, setStyle] = useState<MusicStyle>(DEFAULT_MUSIC_STYLE);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved && MUSIC_STYLES.some((s) => s.id === saved)) setStyle(saved as MusicStyle);
    } catch {
      /* storage blocked - the default is used */
    }
  }, []);
  function choose(s: MusicStyle) {
    setStyle(s);
    try {
      window.localStorage.setItem(KEY, s);
    } catch {
      /* not remembered */
    }
  }
  return [style, choose];
}

/** Dropdown of music styles with a Listen button that plays a short sample. */
export function MusicStylePicker({ value, onChange, disabled }: { value: MusicStyle; onChange: (s: MusicStyle) => void; disabled?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  function stop() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setPlaying(false);
  }

  useEffect(() => stop, []);

  function listen() {
    if (playing) {
      stop();
      return;
    }
    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      scheduleMusic(ctx, ctx.destination, ctx.currentTime + 0.1, PREVIEW_SECONDS, [], value);
      setPlaying(true);
      timerRef.current = window.setTimeout(stop, (PREVIEW_SECONDS + 0.5) * 1000);
    } catch {
      stop();
    }
  }

  const current = MUSIC_STYLES.find((s) => s.id === value);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={value}
        onChange={(e) => {
          if (playing) stop();
          onChange(e.target.value as MusicStyle);
        }}
        disabled={disabled}
        aria-label="Music style"
        title={current?.hint}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-ink outline-none focus:border-primary disabled:opacity-50"
      >
        {MUSIC_STYLES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={listen}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50"
      >
        {playing ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} {playing ? "Stop" : "Listen"}
      </button>
    </div>
  );
}
