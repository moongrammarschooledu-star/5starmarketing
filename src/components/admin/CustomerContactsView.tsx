"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  MessageCircle,
  Pencil,
  Phone,
  PlusCircle,
  Download,
  Search,
  Send,
  Smartphone,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { site, whatsappUrlFor, smsUrlFor } from "@/lib/site";
import { contactSources } from "@/lib/models/contact";
import { buildVcard } from "@/lib/vcard";
import { propertyTypes } from "@/lib/models/property";
import {
  deleteContactAction,
  logContactMessagedAction,
  saveContactAction,
  type ContactFormState,
} from "@/lib/actions/contacts.actions";

export interface ContactRow {
  id: string;
  name: string;
  phone: string;
  /** Number used for WhatsApp (falls back to the phone). */
  whatsapp: string;
  /** What was typed in the WhatsApp box (may be empty). */
  whatsappRaw: string;
  propertyDetail: string;
  remarks: string;
  source: string;
  purpose: string;
  propertyType: string;
  area: string;
  budgetText: string;
  sizeText: string;
  /** "Buy - House - Johar Town - up to 1.5 Crore" */
  wants: string;
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

export interface MatchLite {
  id: string;
  slug: string;
  title: string;
  location: string;
  size: string;
  price: string;
  score: number;
  level: string;
}

type Channel = "whatsapp" | "sms";

const PRESETS: { label: string; text: string }[] = [
  { label: "New property", text: "We have a new property that may suit what you are looking for." },
  { label: "Follow-up", text: "Just checking in about your property requirement. Are you still looking? Please let us know and we will arrange the best options." },
  { label: "Documents", text: "As discussed, please find the documents / details below." },
  {
    label: "Save our number",
    text: `Please save our number ${site.phoneDisplay2} in your phone so you can see our latest property updates on our WhatsApp Status. Tap here to save it: ${site.url}${site.contactCardPath}`,
  },
  ...(site.whatsappChannelUrl
    ? [{ label: "Follow our channel", text: `Follow our WhatsApp Channel for new properties and updates - no need to save any number: ${site.whatsappChannelUrl}` }]
    : []),
];

/** Downloads the customers as a phone-book file (.vcf) that can be imported into a phone or Google Contacts. */
function downloadVcf(list: ContactRow[]) {
  const text = buildVcard(
    list.map((r) => ({
      name: r.name,
      phones: [r.phone, r.whatsappRaw],
      org: "5STAR.M Customer",
      note: r.propertyDetail || undefined,
    })),
  );
  const blob = new Blob([text], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `5starm-customers-${new Date().toISOString().slice(0, 10)}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const INPUT = "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary";
const LABEL = "text-xs font-bold uppercase tracking-wide text-muted-foreground";

/** Details and public link of a property. The owner's private details are never part of it. */
function propertyLines(p: { title: string; location: string; size: string; price: string; slug: string }): string[] {
  return [p.title, `Location: ${p.location}`, `Size: ${p.size}`, `Price: ${p.price}`, "", `Details and photos: ${site.url}/properties/${p.slug}`];
}

/* ------------------------------------------------------------------ */
/* Add / edit form                                                     */
/* ------------------------------------------------------------------ */

function ContactFormModal({ contact, onClose }: { contact: ContactRow | null; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<ContactFormState, FormData>(saveContactAction.bind(null, contact?.id ?? null), {});
  const [moreOpen, setMoreOpen] = useState(Boolean(contact && (contact.purpose || contact.propertyType || contact.area || contact.budgetText || contact.sizeText)));

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={contact ? "Edit contact" : "Add contact"}>
      <form action={formAction} className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-heading text-base font-extrabold text-ink">{contact ? "Edit contact" : "Add a customer"}</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="c-name">
              Customer name *
            </label>
            <input id="c-name" name="name" required defaultValue={contact?.name} className={`mt-2 ${INPUT}`} autoFocus />
          </div>
          <div>
            <label className={LABEL} htmlFor="c-phone">
              Contact number *
            </label>
            <input id="c-phone" name="phone" required inputMode="tel" defaultValue={contact?.phone} placeholder="0300 1234567" className={`mt-2 ${INPUT}`} />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor="c-detail">
              Property detail (what the customer wants)
            </label>
            <input id="c-detail" name="propertyDetail" defaultValue={contact?.propertyDetail} placeholder="e.g. 5 marla house near Johar Town, ground floor" className={`mt-2 ${INPUT}`} />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor="c-remarks">
              Remarks
            </label>
            <textarea id="c-remarks" name="remarks" rows={3} defaultValue={contact?.remarks} placeholder="Anything worth remembering - when to call back, who referred, etc." className={`mt-2 ${INPUT}`} />
          </div>
          <div>
            <label className={LABEL} htmlFor="c-source">
              How did they reach us?
            </label>
            <select id="c-source" name="source" defaultValue={contact?.source ?? "Walk-in"} className={`mt-2 ${INPUT}`}>
              {contactSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="c-wa">
              WhatsApp number (if different)
            </label>
            <input id="c-wa" name="whatsapp" inputMode="tel" defaultValue={contact?.whatsappRaw} className={`mt-2 ${INPUT}`} />
          </div>

          <div className="sm:col-span-2">
            <button type="button" onClick={() => setMoreOpen((v) => !v)} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              <Sparkles className="h-3.5 w-3.5" /> {moreOpen ? "Hide" : "Add"} details to find matching properties (optional)
            </button>
          </div>
          <div className={`grid gap-4 sm:col-span-2 sm:grid-cols-2 ${moreOpen ? "" : "hidden"}`}>
            <div>
              <label className={LABEL} htmlFor="c-purpose">
                Wants to
              </label>
              <select id="c-purpose" name="purpose" defaultValue={contact?.purpose ?? ""} className={`mt-2 ${INPUT}`}>
                <option value="">Not sure</option>
                <option value="For Sale">Buy</option>
                <option value="For Rent">Rent</option>
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="c-type">
                Property type
              </label>
              <select id="c-type" name="propertyType" defaultValue={contact?.propertyType ?? ""} className={`mt-2 ${INPUT}`}>
                <option value="">Any type</option>
                {propertyTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="c-area">
                Area(s)
              </label>
              <input id="c-area" name="area" defaultValue={contact?.area} placeholder="Johar Town, DHA" className={`mt-2 ${INPUT}`} />
            </div>
            <div>
              <label className={LABEL} htmlFor="c-budget">
                Budget (up to)
              </label>
              <input id="c-budget" name="budgetMax" defaultValue={contact?.budgetText} placeholder="1.5 crore" className={`mt-2 ${INPUT}`} />
            </div>
            <div>
              <label className={LABEL} htmlFor="c-size">
                Size
              </label>
              <input id="c-size" name="sizeMarla" defaultValue={contact?.sizeText} placeholder="5 marla" className={`mt-2 ${INPUT}`} />
            </div>
          </div>

          {state.error && <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary sm:col-span-2">{state.error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-full border border-border px-5 py-2 text-xs font-bold text-ink hover:bg-surface-muted">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
            {pending ? "Saving..." : contact ? "Save changes" : "Add customer"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Matching properties of one contact                                  */
/* ------------------------------------------------------------------ */

function MatchesModal({ contact, matches, onClose }: { contact: ContactRow; matches: MatchLite[]; onClose: () => void }) {
  const [sent, setSent] = useState<Set<string>>(new Set());
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Matching properties">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-heading text-base font-extrabold text-ink">Properties for {contact.name}</h2>
            <p className="text-xs text-muted">{contact.wants}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="divide-y divide-border overflow-y-auto">
          {matches.map((m) => {
            const text = [`Assalam-o-Alaikum ${contact.name},`, "", "We have a property that matches what you are looking for:", "", ...propertyLines(m), "", `${site.fullName} - ${site.phoneDisplay2}`].join("\n");
            const done = sent.has(m.id);
            return (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <a href={`/properties/${m.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-ink hover:text-primary">
                    {m.title}
                  </a>
                  <p className="text-xs text-muted">
                    {m.location} - {m.size} - {m.price}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success">
                    <Sparkles className="h-3 w-3" /> {m.level} match ({m.score}%)
                  </span>
                </div>
                <a
                  href={whatsappUrlFor(contact.whatsapp, text)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setSent((s) => new Set(s).add(m.id));
                    void logContactMessagedAction(contact.id, "whatsapp", m.title);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold ${done ? "border border-success/40 text-success" : "bg-success text-white hover:opacity-90"}`}
                >
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />} {done ? "Sent - send again" : "Send on WhatsApp"}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function CustomerContactsView({
  rows,
  matches,
  properties,
}: {
  rows: ContactRow[];
  matches: Record<string, MatchLite[]>;
  properties: ShareableProperty[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ contact: ContactRow | null } | null>(null);
  const [matchFor, setMatchFor] = useState<ContactRow | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [body, setBody] = useState(PRESETS[0].text);
  const [propertyId, setPropertyId] = useState("");
  const [docUrls, setDocUrls] = useState<Set<string>>(new Set());
  const [extraLink, setExtraLink] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState("");
  const [, startTransition] = useTransition();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.name, r.phone, r.whatsapp, r.propertyDetail, r.remarks, r.wants, r.source].join(" ").toLowerCase().includes(q));
  }, [rows, query]);

  const allSelected = shown.length > 0 && shown.every((r) => selected.has(r.id));
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
    setSelected(allSelected ? new Set() : new Set(shown.map((r) => r.id)));
  }

  function toggleDoc(url: string) {
    setDocUrls((s) => {
      const next = new Set(s);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function remove(r: ContactRow) {
    if (!window.confirm(`Delete ${r.name} from your contacts? This cannot be undone.`)) return;
    setDeleteError("");
    startTransition(async () => {
      const res = await deleteContactAction(r.id);
      if (!res.ok) setDeleteError(res.error ?? "Could not delete this contact.");
      else
        setSelected((s) => {
          const next = new Set(s);
          next.delete(r.id);
          return next;
        });
    });
  }

  function messageFor(name: string): string {
    const lines = [`Assalam-o-Alaikum ${name},`, ""];
    if (body.trim()) lines.push(body.trim(), "");
    if (property) {
      lines.push(...propertyLines(property), "");
      const docs = property.documents.filter((d) => docUrls.has(d.url));
      for (const d of docs) lines.push(`${d.name}: ${d.url}`);
      if (docs.length) lines.push("");
    }
    if (extraLink.trim()) lines.push(extraLink.trim(), "");
    lines.push(`${site.fullName} - ${site.phoneDisplay2}`);
    return lines.join("\n");
  }

  function markSent(id: string, channel: Channel) {
    setSent((s) => new Set(s).add(`${id}:${channel}`));
    void logContactMessagedAction(id, channel, property?.title);
  }

  const preview = chosen[0] ? messageFor(chosen[0].name) : messageFor("(customer name)");

  return (
    <div>
      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, number, detail or remarks" className={`${INPUT} pl-9`} />
        </div>
        <button
          type="button"
          onClick={() => setForm({ contact: null })}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <PlusCircle className="h-4 w-4" /> Add Customer
        </button>
      </div>

      {/* Selection bar */}
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
            disabled={rows.length === 0}
            onClick={() => downloadVcf(selected.size > 0 ? chosen : shown)}
            title="Download as a phone-book file to import into your phone or Google Contacts"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-bold text-ink hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> {selected.size > 0 ? "Save selected to phone (.vcf)" : "Save all to phone (.vcf)"}
          </button>
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
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        WhatsApp shows your Status only to people who have your number saved (and you theirs). Use <b>Save selected to phone</b> to put these customers in your phone, and send
        them the <b>Save our number</b> message so they save yours.
      </p>
      {deleteError && <p className="mt-2 text-sm font-semibold text-primary">{deleteError}</p>}

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
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  {rows.length === 0 ? "No contacts yet. Press Add Customer when someone visits or calls." : "No contact matches your search."}
                </td>
              </tr>
            )}
            {shown.map((r) => {
              const found = matches[r.id] ?? [];
              return (
                <tr key={r.id} className={`border-b border-border align-top last:border-0 hover:bg-surface-muted/50 ${selected.has(r.id) ? "bg-primary/5" : ""}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} className="h-4 w-4 accent-primary" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{r.name}</div>
                    <div className="text-xs text-muted">
                      {r.source} - {r.added}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 font-semibold text-ink hover:text-primary">
                      <Phone className="h-3.5 w-3.5" /> {r.phone}
                    </a>
                    {r.whatsappRaw && r.whatsappRaw !== r.phone && <div className="text-xs text-muted">WhatsApp: {r.whatsappRaw}</div>}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    <div>{r.propertyDetail || <span className="text-muted">-</span>}</div>
                    {r.wants && <div className="text-xs text-muted">{r.wants}</div>}
                    {found.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setMatchFor(r)}
                        className="mt-1 inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-bold text-success hover:bg-success/20"
                      >
                        <Sparkles className="h-3 w-3" /> {found.length} matching {found.length === 1 ? "property" : "properties"}
                      </button>
                    )}
                  </td>
                  <td className="max-w-[240px] px-4 py-3 text-xs text-muted">
                    <span className="line-clamp-3 whitespace-pre-line">{r.remarks || "-"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={whatsappUrlFor(r.whatsapp, `Assalam-o-Alaikum ${r.name},`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => void logContactMessagedAction(r.id, "whatsapp")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Chat
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setForm({ contact: r })} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-ink" aria-label={`Edit ${r.name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => remove(r)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-primary/10 hover:text-primary" aria-label={`Delete ${r.name}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {form && <ContactFormModal key={form.contact?.id ?? "new"} contact={form.contact} onClose={() => setForm(null)} />}
      {matchFor && <MatchesModal contact={matchFor} matches={matches[matchFor.id] ?? []} onClose={() => setMatchFor(null)} />}

      {/* Message selected */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Message selected customers">
          <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-heading text-base font-extrabold text-ink">
                Message {chosen.length} customer{chosen.length === 1 ? "" : "s"}
              </h2>
              <button type="button" onClick={() => setPanelOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className={LABEL}>Your message</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {PRESETS.map((p) => (
                      <button key={p.label} type="button" onClick={() => setBody(p.text)} className="rounded-full border border-border px-3 py-1 text-xs font-bold text-ink hover:border-primary hover:text-primary">
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={`mt-2 ${INPUT}`} placeholder="Write your message" />
                  <p className="mt-1 text-[11px] text-muted">Each customer&apos;s name is added at the top automatically.</p>
                </div>

                <div>
                  <label className={LABEL} htmlFor="share-property">
                    Send a property (optional)
                  </label>
                  <select
                    id="share-property"
                    value={propertyId}
                    onChange={(e) => {
                      setPropertyId(e.target.value);
                      setDocUrls(new Set());
                    }}
                    className={`mt-2 ${INPUT}`}
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
                  <label className={LABEL} htmlFor="share-link">
                    Another link (optional)
                  </label>
                  <input id="share-link" value={extraLink} onChange={(e) => setExtraLink(e.target.value)} placeholder="e.g. a brochure or video link" className={`mt-2 ${INPUT}`} />
                </div>

                <div>
                  <p className={LABEL}>What the customer will see</p>
                  <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#dcf8c6] p-3 font-sans text-xs text-[#111]">{preview}</pre>
                </div>
              </div>

              <div>
                <p className={LABEL}>Send to each customer</p>
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
                            href={smsUrlFor(r.phone, text)}
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
