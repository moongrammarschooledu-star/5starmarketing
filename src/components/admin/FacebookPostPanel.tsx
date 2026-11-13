"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Copy, Download, Facebook, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { publishBrochurePostAction, type PublishResult } from "@/lib/actions/social.actions";
import { captionLangLabels, type CaptionLang } from "@/lib/facebookPost";
import { useToast } from "./ToastProvider";

const LANGS: CaptionLang[] = ["en", "ur", "roman"];

// The image is rendered on demand by the admin-only route; the caption is
// built from the property's own saved details in three languages and stays
// editable here before copying, so the admin can tweak it freely.
export function FacebookPostPanel({
  brochureId,
  captions,
  social = { facebook: false, instagram: false },
}: {
  brochureId: string;
  captions: Record<CaptionLang, string>;
  /** Which accounts are connected (set up in the server environment). */
  social?: { facebook: boolean; instagram: boolean };
}) {
  const [toFacebook, setToFacebook] = useState(social.facebook);
  const [toInstagram, setToInstagram] = useState(false);
  const [posting, startPosting] = useTransition();
  const [results, setResults] = useState<PublishResult[]>([]);
  const [postError, setPostError] = useState("");
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

  function publish() {
    const names = [toFacebook && "Facebook", toInstagram && "Instagram"].filter(Boolean).join(" and ");
    if (!names) {
      setPostError("Tick at least one account to post to.");
      return;
    }
    if (!window.confirm(`Post this picture and caption on ${names} now? It becomes public straight away.`)) return;
    setPostError("");
    setResults([]);
    startPosting(async () => {
      const res = await publishBrochurePostAction(brochureId, { facebook: toFacebook, instagram: toInstagram }, texts[lang]);
      if (res.error) setPostError(res.error);
      setResults(res.results);
      if (res.results.some((r) => r.ok)) toast.show("Posted.");
    });
  }

  const anyConnected = social.facebook || social.instagram;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2">
        <Facebook className="h-4.5 w-4.5 text-primary" />
        <h2 className="font-heading text-sm font-bold text-ink">Social Media Post</h2>
      </div>
      <p className="mt-1 text-xs text-muted">
        Pick a caption language and edit it if you like. Then post it straight to your Facebook Page and Instagram below, or download the image and copy the caption to post by hand.
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

      <div className="mt-5 rounded-xl border border-border bg-surface-muted/50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Post directly from here</p>
        {anyConnected ? (
          <>
            <div className="mt-3 flex flex-wrap gap-4">
              <label className={`flex items-center gap-2 text-sm font-semibold ${social.facebook ? "text-ink" : "text-muted"}`}>
                <input type="checkbox" disabled={!social.facebook} checked={toFacebook} onChange={(e) => setToFacebook(e.target.checked)} className="h-4 w-4 accent-primary" />
                Facebook Page {!social.facebook && <span className="text-xs font-normal">(not connected)</span>}
              </label>
              <label className={`flex items-center gap-2 text-sm font-semibold ${social.instagram ? "text-ink" : "text-muted"}`}>
                <input type="checkbox" disabled={!social.instagram} checked={toInstagram} onChange={(e) => setToInstagram(e.target.checked)} className="h-4 w-4 accent-primary" />
                Instagram {!social.instagram && <span className="text-xs font-normal">(not connected)</span>}
              </label>
            </div>
            <button
              type="button"
              disabled={posting}
              onClick={publish}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" /> {posting ? "Posting..." : "Post now"}
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            No social account is connected yet, so posting is by hand for now.{" "}
            <Link href="/admin/marketing/social" className="font-bold text-primary hover:underline">
              Connect Facebook and Instagram
            </Link>
          </p>
        )}
        {postError && (
          <p className="mt-3 flex items-start gap-2 text-xs font-semibold text-primary">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {postError}
          </p>
        )}
        {results.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {results.map((r) => (
              <li key={r.platform} className="flex items-start gap-2 text-xs">
                {r.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
                <span className={r.ok ? "text-ink" : "text-primary"}>
                  <b>{r.platform}:</b> {r.ok ? "posted." : r.error}{" "}
                  {r.ok && r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">
                      View post
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
