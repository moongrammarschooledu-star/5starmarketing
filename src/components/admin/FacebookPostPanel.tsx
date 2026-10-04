"use client";

import { useState } from "react";
import { Copy, Download, Facebook } from "lucide-react";
import { captionLangLabels, type CaptionLang } from "@/lib/facebookPost";
import { useToast } from "./ToastProvider";

const LANGS: CaptionLang[] = ["en", "ur", "roman"];

// The image is rendered on demand by the admin-only route; the caption is
// built from the property's own saved details in three languages and stays
// editable here before copying, so the admin can tweak it freely.
export function FacebookPostPanel({
  brochureId,
  captions,
}: {
  brochureId: string;
  captions: Record<CaptionLang, string>;
}) {
  const [lang, setLang] = useState<CaptionLang>("en");
  const [texts, setTexts] = useState<Record<CaptionLang, string>>(captions);
  const toast = useToast();
  const imageUrl = `/admin/brochures/facebook-image/${brochureId}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(texts[lang]);
      toast.show("Caption copied.");
    } catch {
      toast.show("Could not copy - select the text and copy it manually.");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2">
        <Facebook className="h-4.5 w-4.5 text-primary" />
        <h2 className="font-heading text-sm font-bold text-ink">Facebook Post</h2>
      </div>
      <p className="mt-1 text-xs text-muted">
        Download the post image, pick a caption language, edit it if you like, then copy it and post on Facebook.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Facebook post preview" className="w-full rounded-xl border border-border bg-surface-muted" />
          <a
            href={`${imageUrl}?download=1`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
          >
            <Download className="h-3.5 w-3.5" /> Download Image
          </a>
        </div>

        <div className="flex flex-col">
          <div className="flex flex-wrap gap-2">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                  lang === l ? "bg-primary text-primary-foreground" : "border-2 border-ink/15 text-ink hover:border-primary hover:text-primary"
                }`}
              >
                {captionLangLabels[l]}
              </button>
            ))}
          </div>
          <textarea
            dir="auto"
            value={texts[lang]}
            onChange={(e) => setTexts((t) => ({ ...t, [lang]: e.target.value }))}
            rows={16}
            className="mt-3 w-full flex-1 rounded-lg border border-border bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink outline-none focus:border-primary"
          />
          <div className="mt-3 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-success/40 px-4 py-2.5 text-xs font-bold text-success hover:bg-success/5"
            >
              <Copy className="h-3.5 w-3.5" /> Copy Caption
            </button>
            <button
              type="button"
              onClick={() => setTexts((t) => ({ ...t, [lang]: captions[lang] }))}
              className="rounded-full border-2 border-ink/15 px-4 py-2.5 text-xs font-bold text-ink hover:border-primary hover:text-primary"
            >
              Reset Caption
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
