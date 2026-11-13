import { toWhatsAppNumber } from "./site";

// Minimal vCard 3.0 writer: one card per person, readable by iPhone, Android
// and Google Contacts. Used for the public "save our number" card and for
// downloading customers so they can be imported into a phone.

export interface VcardEntry {
  name: string;
  /** Any format ("0300 1234567", "+92 300 1234567"); stored as +92... */
  phones: string[];
  org?: string;
  url?: string;
  email?: string;
  address?: string;
  note?: string;
}

function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function cleanPhones(phones: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of phones) {
    const digits = toWhatsAppNumber(raw);
    if (digits.length < 8 || seen.has(digits)) continue;
    seen.add(digits);
    out.push(`+${digits}`);
  }
  return out;
}

export function buildVcard(entries: VcardEntry[]): string {
  const cards: string[] = [];
  for (const e of entries) {
    const name = e.name.trim();
    const phones = cleanPhones(e.phones);
    if (!name || phones.length === 0) continue;
    const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:;${esc(name)};;;`, `FN:${esc(name)}`];
    if (e.org) lines.push(`ORG:${esc(e.org)}`);
    phones.forEach((p, i) => lines.push(`TEL;TYPE=CELL${i === 0 ? ",PREF" : ""}:${p}`));
    if (e.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(e.email)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (e.address) lines.push(`ADR;TYPE=WORK:;;${esc(e.address)};;;;`);
    if (e.note) lines.push(`NOTE:${esc(e.note)}`);
    lines.push("END:VCARD");
    cards.push(lines.join("\r\n"));
  }
  return cards.join("\r\n") + "\r\n";
}
