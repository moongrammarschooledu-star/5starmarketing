"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Send, Smartphone, X } from "lucide-react";
import { site, whatsappUrlFor, smsUrlFor } from "@/lib/site";

export interface OwnerInfo {
  name: string;
  phone: string;
  altPhone: string;
}

export interface OwnerPreset {
  label: string;
  text: string;
}

export const PROPERTY_OWNER_PRESETS: OwnerPreset[] = [
  { label: "Still available?", text: "Is your property still available? Please also confirm the current price." },
  { label: "Buyer interested", text: "We have a customer interested in your property. When can we arrange a visit?" },
  { label: "Price update", text: "Could you please confirm the latest price you want for your property?" },
  { label: "Need documents", text: "Please send us the property documents and a few clear photos so we can show it to clients." },
];

export const BROCHURE_OWNER_PRESETS: OwnerPreset[] = [
  { label: "Send brochure", text: "Please find the brochure we have made for your property. Please check it and tell us if anything needs to be changed." },
  { label: "Approve brochure", text: "Here is the brochure of your property. Kindly confirm that the details are correct so we can start sharing it with clients." },
];

/** A message to the OWNER of a property - for the team only. The owner's number
 *  is private staff data and is read only on this admin page. */
export function OwnerMessageModal({
  title,
  detailLines,
  presets,
  owner,
  loadFailed,
  editHref,
  blockedReason,
  onSent,
  onClose,
}: {
  /** What the message is about, shown under the heading. */
  title: string;
  /** Lines added under the message (property details, a brochure link...). */
  detailLines: string[];
  presets: OwnerPreset[];
  owner?: OwnerInfo;
  loadFailed: boolean;
  /** Where the owner's number can be added. */
  editHref: string;
  /** When set, nothing can be sent yet and this explains why. */
  blockedReason?: string;
  /** Called when WhatsApp or SMS is opened, so it can be recorded. */
  onSent: (channel: "whatsapp" | "sms") => void;
  onClose: () => void;
}) {
  // The same number is sometimes typed in both boxes - list it once.
  const numbers = [...new Set([owner?.phone, owner?.altPhone].map((n) => n?.trim()).filter((n): n is string => Boolean(n)))];
  const [number, setNumber] = useState(numbers[0] ?? "");
  const [body, setBody] = useState(presets[0]?.text ?? "");
  const [sent, setSent] = useState<Record<string, boolean>>({});

  const greeting = owner?.name ? `Assalam-o-Alaikum ${owner.name},` : "Assalam-o-Alaikum,";
  const message = [
    greeting,
    "",
    body.trim(),
    "",
    ...detailLines,
    "",
    `${site.fullName} - ${site.phoneDisplay2}`,
  ].join("\n");

  function done(channel: "whatsapp" | "sms") {
    setSent((s) => ({ ...s, [channel]: true }));
    onSent(channel);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Message the owner">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-heading text-base font-extrabold text-ink">Message the owner</h2>
            <p className="truncate text-xs text-muted">{title}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {numbers.length === 0 ? (
          <div className="space-y-3 p-5 text-sm text-ink">
            {loadFailed ? (
              <p className="font-semibold text-primary">The owner numbers could not be loaded just now. Please refresh the page and try again.</p>
            ) : (
              <p>No owner number is saved for this property yet.</p>
            )}
            <Link href={editHref} className="inline-flex rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover">
              Open Edit to add the owner&apos;s number
            </Link>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Owner</p>
              <p className="mt-1 text-sm font-semibold text-ink">{owner?.name || "Name not saved"}</p>
              {numbers.length > 1 ? (
                <select value={number} onChange={(e) => setNumber(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" aria-label="Owner number">
                  {numbers.map((n, i) => (
                    <option key={n} value={n}>
                      {n} {i === 0 ? "(main)" : "(other)"}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted">{numbers[0]}</p>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Message</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button key={p.label} type="button" onClick={() => setBody(p.text)} className="rounded-full border border-border px-3 py-1 text-xs font-bold text-ink hover:border-primary hover:text-primary">
                    {p.label}
                  </button>
                ))}
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
              />
              <p className="mt-1 text-[11px] text-muted">The owner&apos;s name and the details below are added automatically.</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">What the owner will see</p>
              <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#dcf8c6] p-3 font-sans text-xs text-[#111]">{message}</pre>
            </div>

            {blockedReason && <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{blockedReason}</p>}

            <div className={`flex flex-wrap gap-2 ${blockedReason ? "pointer-events-none opacity-40" : ""}`} aria-disabled={Boolean(blockedReason)}>
              <a
                href={whatsappUrlFor(number, message)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => done("whatsapp")}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${sent.whatsapp ? "border border-success/40 text-success" : "bg-success text-white hover:opacity-90"}`}
              >
                {sent.whatsapp ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />} {sent.whatsapp ? "Opened - send again" : "Open WhatsApp"}
              </a>
              <a
                href={smsUrlFor(number, message)}
                onClick={() => done("sms")}
                title="Opens the SMS app on a phone"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
              >
                {sent.sms ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Smartphone className="h-3.5 w-3.5" />} SMS
              </a>
            </div>
            <p className="text-[11px] leading-relaxed text-muted">WhatsApp opens with the message already written; you press send inside WhatsApp. SMS opens the messaging app, so use it from a phone.</p>
          </div>
        )}
      </div>
    </div>
  );
}
