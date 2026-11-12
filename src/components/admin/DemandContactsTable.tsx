"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, MessageCircle, Smartphone, Sparkles, X, Send, Phone } from "lucide-react";
import { site, whatsappUrlFor, toWhatsAppNumber } from "@/lib/site";
import { logDemandContactedAction } from "@/lib/actions/demands.actions";

export interface ContactRow {
  id: string;
  name: string;
  /** Number to call. */
  phone: string;
  /** Number for WhatsApp (falls back to the phone). */
  whatsapp: string;
  wants: string; // "Buy - House, Flat"
  where: string; // "Johar Town, DHA" or "Anywhere"
  budget: string;
  size: string;
  remarks: string;
  status: string;
  statusTone: string;
  urgent: string; // "Urgent" / "High" / ""
  matchLabel: string; // "2 good" / "3 possible" / ""
  added: string;
}

export interface ShareableProperty {
  id: string;
  slug: string;
  title: string;
  location: string;
  size: string;
  price: string;
  documents: { name: string; url: string }[];
}

type Channel = "whatsapp" | "sms";

const PRESETS: { label: string; text: string }[] = [
  { label: "New property", text: "We have a new property that may suit what you are looking for." },
  { label: "Follow-up", text: "Just checking in about your property requirement. Are you still looking? Please let us know and we will arrange the best options." },
  { label: "Documents", text: "As discussed, please find the documents / details below." },
];

function smsUrl(number: string, body: string): string {
  const digits = `+${toWhatsAppNumber(number)}`;
  return `sms:${digits}?body=${encodeURIComponent(body)}`;
}

export function DemandContactsTable({ rows, properties }: { rows: ContactRow[]; properties: ShareableProperty[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen] = useState(false);
  const [body, setBody] = useState(PRESETS[0].text);
  const [propertyId, setPropertyId] = useState("");
  const [docUrls, setDocUrls] = useState<Set<string>>(new Set());
  const [extraLink, setExtraLink] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set()); // "<id>:<channel>"

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const chosen = useMemo(() => rows.filter((r) => selected.has(r.id)), [rows, selected]);
  const property = properties.find((p) => p.id === propertyId);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function pickProperty(id: string) {
    setPropertyId(id);
    setDocUrls(new Set());
  }

  function toggleDoc(url: string) {
    setDocUrls((s) => {
      const next = new Set(s);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  /** The text for one customer. The owner's private details are never part of it. */
  function messageFor(name: string): string {
    const lines = [`Assalam-o-Alaikum ${name},`, ""];
    if (body.trim()) lines.push(body.trim(), "");
    if (property) {
      lines.push(property.title, `Location: ${property.location}`, `Size: ${property.size}`, `Price: ${property.price}`, "", `Details and photos: ${site.url}/properties/${property.slug}`, "");
      const docs = property.documents.filter((d) => docUrls.has(d.url));
      for (const d of docs) lines.push(`${d.name}: ${d.url}`);
      if (docs.length) lines.push("");
    }
    if (extraLink.trim()) lines.push(extraLink.trim(), "");
    lines.push(`${site.fullName} - ${site.phoneDisplay}`);
    return lines.join("\n");
  }

  function markSent(id: string, channel: Channel) {
    setSent((s) => new Set(s).add(`${id}:${channel}`));
    void logDemandContactedAction(id, channel, property?.title);
  }

  const preview = chosen[0] ? messageFor(chosen[0].name) : messageFor("(customer name)");

  return (
    <div>
      {/* Action bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <p className="text-sm text-ink">
          <span className="font-bold">{selected.size}</span> selected
          {selected.size === 0 && <span className="text-muted"> - tick the customers you want to message</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          {selected.size > 0 && (
            <button type="button" onClick={() => setSelected(new Set())} className="rounded-full border border-border px-3.5 py-2 text-xs font-bold text-ink hover:bg-surface-muted">
              Clear
            </button>
          )}
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => setPanelOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-success px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Message selected
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all customers" className="h-4 w-4 accent-primary" />
              </th>
              <th className="px-4 py-3">Customer name</th>
              <th className="px-4 py-3">Contact number</th>
              <th className="px-4 py-3">Property detail</th>
              <th className="px-4 py-3">Remarks</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No customers here yet. Add the first one when a client asks for a property.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className={`border-b border-border align-top last:border-0 hover:bg-surface-muted/50 ${selected.has(r.id) ? "bg-primary/5" : ""}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} className="h-4 w-4 accent-primary" />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/demands/${r.id}`} className="font-semibold text-ink hover:text-primary">
                    {r.name}
                  </Link>
                  <div className="text-xs text-muted">Added {r.added}</div>
                </td>
                <td className="px-4 py-3">
                  <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 font-semibold text-ink hover:text-primary">
                    <Phone className="h-3.5 w-3.5" /> {r.phone}
                  </a>
                  {r.whatsapp !== r.phone && <div className="text-xs text-muted">WhatsApp: {r.whatsapp}</div>}
                </td>
                <td className="px-4 py-3 text-ink">
                  <div className="font-semibold">{r.wants}</div>
                  <div className="text-xs text-muted">
                    {r.where} - {r.budget} - {r.size}
                  </div>
                  {r.matchLabel && (
                    <Link href={`/admin/demands/${r.id}`} className="mt-1 inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success">
                      <Sparkles className="h-3 w-3" /> {r.matchLabel}
                    </Link>
                  )}
                </td>
                <td className="max-w-[260px] px-4 py-3 text-xs text-muted">
                  <span className="line-clamp-3 whitespace-pre-line">{r.remarks || "-"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${r.statusTone}`}>{r.status}</span>
                  {r.urgent && <div className="mt-1 text-xs font-bold text-primary">{r.urgent}</div>}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={whatsappUrlFor(r.whatsapp, `Assalam-o-Alaikum ${r.name},`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Chat
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Message panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Message selected customers">
          <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-heading text-base font-extrabold text-ink">Message {chosen.length} customer{chosen.length === 1 ? "" : "s"}</h2>
              <button type="button" onClick={() => setPanelOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 md:grid-cols-2">
              {/* Compose */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your message</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {PRESETS.map((p) => (
                      <button key={p.label} type="button" onClick={() => setBody(p.text)} className="rounded-full border border-border px-3 py-1 text-xs font-bold text-ink hover:border-primary hover:text-primary">
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
                    placeholder="Write your message"
                  />
                  <p className="mt-1 text-[11px] text-muted">Each customer&apos;s name is added at the top automatically.</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground" htmlFor="share-property">
                    Send a property (optional)
                  </label>
                  <select
                    id="share-property"
                    value={propertyId}
                    onChange={(e) => pickProperty(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
                  >
                    <option value="">No property</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} - {p.price}
                      </option>
                    ))}
                  </select>
                  {property && property.documents.length > 0 && (
                    <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-surface-muted/50 p-3">
                      <p className="text-xs font-semibold text-ink">Documents of this property - tick to include the link</p>
                      {property.documents.map((d) => (
                        <label key={d.url} className="flex items-center gap-2 text-xs text-ink">
                          <input type="checkbox" checked={docUrls.has(d.url)} onChange={() => toggleDoc(d.url)} className="h-4 w-4 accent-primary" /> {d.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground" htmlFor="share-link">
                    Another link (optional)
                  </label>
                  <input
                    id="share-link"
                    value={extraLink}
                    onChange={(e) => setExtraLink(e.target.value)}
                    placeholder="e.g. a brochure or video link"
                    className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">What the customer will see</p>
                  <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#dcf8c6] p-3 font-sans text-xs text-[#111]">{preview}</pre>
                </div>
              </div>

              {/* Send list */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Send to each customer</p>
                <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                  {chosen.map((r) => {
                    const waDone = sent.has(`${r.id}:whatsapp`);
                    const smsDone = sent.has(`${r.id}:sms`);
                    const text = messageFor(r.name);
                    return (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{r.name}</p>
                          <p className="text-xs text-muted">{r.whatsapp}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <a
                            href={whatsappUrlFor(r.whatsapp, text)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => markSent(r.id, "whatsapp")}
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${waDone ? "border border-success/40 text-success" : "bg-success text-white hover:opacity-90"}`}
                          >
                            {waDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />} {waDone ? "Sent" : "WhatsApp"}
                          </a>
                          <a
                            href={smsUrl(r.phone, text)}
                            onClick={() => markSent(r.id, "sms")}
                            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${smsDone ? "border-success/40 text-success" : "border-border text-ink hover:border-primary hover:text-primary"}`}
                            title="Opens the SMS app on a phone"
                          >
                            {smsDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />} SMS
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-[11px] leading-relaxed text-muted">
                  WhatsApp opens one customer at a time with the message already written - you press send inside WhatsApp. This keeps your number safe: WhatsApp
                  blocks numbers that send the same text to many people automatically. SMS opens the messaging app, so use it from a phone.
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-border px-5 py-3">
              <button type="button" onClick={() => setPanelOpen(false)} className="rounded-full bg-ink px-5 py-2 text-xs font-bold text-white hover:opacity-90">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
