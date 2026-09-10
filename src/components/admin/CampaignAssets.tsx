"use client";

import { useState } from "react";
import Image from "next/image";
import { Copy, MessageCircle, Download, Link as LinkIcon } from "lucide-react";
import type { Campaign } from "@/lib/models/campaign";

export function CampaignAssets({
  campaign,
  campaignUrl,
  qrDataUrl,
  whatsappUrl,
}: {
  campaign: Campaign;
  campaignUrl: string;
  qrDataUrl: string;
  whatsappUrl: string;
}) {
  const [copied, setCopied] = useState<"url" | "whatsapp" | null>(null);

  function copy(text: string, which: "url" | "whatsapp") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
          <LinkIcon className="h-4.5 w-4.5 text-primary" /> Campaign Link
        </h2>
        <p className="mt-1 break-all rounded-lg bg-surface-muted p-3 text-xs text-muted">{campaignUrl}</p>
        <button
          type="button"
          onClick={() => copy(campaignUrl, "url")}
          className="mt-3 flex items-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
        >
          <Copy className="h-3.5 w-3.5" /> {copied === "url" ? "Copied!" : "Copy Link"}
        </button>

        <div className="mt-5 border-t border-border pt-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
            <MessageCircle className="h-4 w-4 text-success" /> Campaign WhatsApp Message
          </h3>
          <p className="mt-2 rounded-lg bg-surface-muted p-3 text-xs text-muted">
            &quot;Assalam-o-Alaikum, I am interested in the property advertised in the {campaign.name} campaign.&quot;
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-success px-4 py-2 text-xs font-bold text-white"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Open WhatsApp
            </a>
            <button
              type="button"
              onClick={() => copy(whatsappUrl, "whatsapp")}
              className="flex items-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
            >
              <Copy className="h-3.5 w-3.5" /> {copied === "whatsapp" ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 text-center">
        <h2 className="font-heading text-sm font-bold text-ink">Scan to View Property</h2>
        <p className="mt-1 text-xs text-muted">For print materials, property fairs and signboards — preserves campaign attribution (utm_medium=qr).</p>
        <div className="mx-auto mt-4 w-fit rounded-2xl border border-border bg-white p-4">
          {/* Data URI from server-side QRCode.toDataURL — unoptimized since Next/Image can't process data: URIs. */}
          <Image src={qrDataUrl} alt={`QR code for ${campaign.name}`} width={200} height={200} unoptimized />
        </div>
        <a
          href={qrDataUrl}
          download={`${campaign.utmCampaign}-qr.png`}
          className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
        >
          <Download className="h-3.5 w-3.5" /> Download QR
        </a>
      </section>
    </div>
  );
}
