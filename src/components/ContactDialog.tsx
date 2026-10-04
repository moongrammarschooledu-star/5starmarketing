"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "5starm_inquiry_contact";
const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

function readSaved(): { name: string; phone: string } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      return { name: typeof v.name === "string" ? v.name : "", phone: typeof v.phone === "string" ? v.phone : "" };
    }
  } catch {
    /* storage unavailable - start empty */
  }
  return { name: "", phone: "" };
}

/** Asks a visitor for their name and phone number before something they
 *  asked for (a WhatsApp chat, a brochure) is handed over, so the lead the
 *  click creates always has real contact details. `onSubmit` runs straight
 *  from the submit click, so it may open a new tab without the browser's
 *  pop-up blocker getting in the way. Details are remembered on the device. */
export function ContactDialog({
  open,
  onClose,
  title,
  description,
  submitLabel,
  submitClassName,
  submitIcon,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  submitLabel: string;
  submitClassName: string;
  submitIcon?: ReactNode;
  onSubmit: (contact: { name: string; phone: string }) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const saved = readSaved();
    setName((n) => n || saved.name);
    setPhone((p) => p || saved.phone);
    setError(null);
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName) return setError("Please enter your name.");
    if (!PHONE_PATTERN.test(cleanPhone)) return setError("Please enter a valid phone number.");
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: cleanName, phone: cleanPhone }));
    } catch {
      /* not essential */
    }
    onSubmit({ name: cleanName, phone: cleanPhone });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/60 p-4 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-bold text-ink">{title}</h2>
            <p className="mt-1 text-xs text-muted">{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-4 block text-xs font-bold text-ink">
          Your name
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={120}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-primary"
          />
        </label>
        <label className="mt-3 block text-xs font-bold text-ink">
          Your phone / WhatsApp number
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="03XX XXXXXXX"
            maxLength={20}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-primary"
          />
        </label>

        {error && <p className="mt-3 text-xs font-semibold text-primary">{error}</p>}

        <button type="submit" className={submitClassName}>
          {submitIcon} {submitLabel}
        </button>
      </form>
    </div>
  );
}
