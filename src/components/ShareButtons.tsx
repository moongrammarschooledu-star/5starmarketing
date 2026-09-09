"use client";

import { useState } from "react";
import { MessageCircle, Facebook, Link as LinkIcon, Check } from "lucide-react";

export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. non-secure context) — the
      // link is still visible/selectable in the address bar either way.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Share:</span>
      <a
        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${text}\n\n${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success hover:bg-success/20"
      >
        <MessageCircle className="h-4 w-4" />
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
      >
        <Facebook className="h-4 w-4" />
      </a>
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copy link"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/10 text-ink hover:bg-ink/15"
      >
        {copied ? <Check className="h-4 w-4 text-success" /> : <LinkIcon className="h-4 w-4" />}
      </button>
      {copied && <span className="text-xs font-semibold text-success">Copied!</span>}
    </div>
  );
}
