"use client";

import { useState } from "react";
import { Clapperboard, Film, Image as ImageIcon } from "lucide-react";
import { AdMakerPanel } from "@/components/admin/AdMakerPanel";
import { PosterMakerPanel } from "@/components/admin/PosterMakerPanel";
import { VideoEditorPanel } from "@/components/admin/VideoEditorPanel";

type Mode = "poster" | "edit" | "video";

const TABS: { id: Mode; label: string; hint: string; icon: typeof ImageIcon }[] = [
  { id: "poster", label: "Poster / Picture ad", hint: "Any ad as a picture (PNG / JPG)", icon: ImageIcon },
  { id: "edit", label: "Edit my video", hint: "Add logo and company details to a video", icon: Film },
  { id: "video", label: "Video ad from pictures", hint: "Pictures + a voice reading the description", icon: Clapperboard },
];

/** The Ad Maker page: a general poster maker and the existing video ad maker. */
export function AdMakerHub() {
  const [mode, setMode] = useState<Mode>("poster");

  return (
    <div>
      <div role="tablist" className="grid gap-2 sm:grid-cols-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = mode === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(t.id)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                active ? "border-primary bg-primary/5 text-primary" : "border-border text-ink hover:border-primary/50"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>
                <span className="block text-sm font-bold">{t.label}</span>
                <span className="text-xs text-muted">{t.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {mode === "poster" ? (
          <PosterMakerPanel />
        ) : mode === "edit" ? (
          <VideoEditorPanel />
        ) : (
          <div className="max-w-4xl">
            <AdMakerPanel />
          </div>
        )}
      </div>
    </div>
  );
}
