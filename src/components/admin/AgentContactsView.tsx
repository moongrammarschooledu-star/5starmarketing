"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Download, ListPlus, MessageCircle, Pencil, Phone, PlusCircle, Search, Send, Smartphone, Trash2, X } from "lucide-react";
import { site, whatsappUrlFor, smsUrlFor } from "@/lib/site";
import { buildVcard } from "@/lib/vcard";
import { companyDetailLines } from "@/lib/shareDetails";
import { agentStatuses, type AgentStatus } from "@/lib/models/agentContact";
import {
  deleteAgentContactAction,
  importAgentContactsAction,
  logAgentMessagedAction,
  saveAgentContactAction,
  setAgentStatusAction,
  type AgentFormState,
} from "@/lib/actions/agentContacts.actions";

export interface AgentRow {
  id: string;
  name: string;
  /** The agent's real estate (office / company) name. */
  agency: string;
  area: string;
  phone: string;
  /** Number used for WhatsApp (falls back to the phone). */
  whatsapp: string;
  /** What was typed in the WhatsApp box (may be empty). */
  whatsappRaw: string;
  remarks: string;
  status: AgentStatus;
  lastContacted: string;
  added: string;
}

export interface AgentShareProperty {
  id: string;
  serialNo: string;
  title: string;
  purpose: string;
  price: string;
  location: string;
  /** The property's details, ready to put in a message. */
  lines: string[];
}

const MAX_PROPERTIES = 5;

const INTRO_TEXT = `This is ${site.fullName}, Johar Town, Lahore. We list properties for sale and rent with photos, price and full details on our website ${site.url}. You are welcome to browse it and share our properties with your clients - we are happy to work together on deals. Please save our number ${site.phoneDisplay2} so we stay in touch.`;

const PRESETS: { label: string; text: string }[] = [
  { label: "Introduce our website", text: INTRO_TEXT },
  { label: "Share a property", text: "We have the property below. If you have a client for it, please share it with them and let us know - we are happy to work together." },
  { label: "Follow-up", text: `Just following up - do you have any clients looking for property in Lahore? We add new listings every week on ${site.url}.` },
  {
    label: "Save our number",
    text: `Please save our number ${site.phoneDisplay2} in your phone so you can see our latest property updates on our WhatsApp Status. Tap here to save it: ${site.url}${site.contactCardPath}`,
  },
];

const STATUS_TONE: Record<AgentStatus, string> = {
  New: "bg-surface-muted text-muted",
  Contacted: "bg-primary/10 text-primary",
  Interested: "bg-amber-500/10 text-amber-700",
  Partner: "bg-success/10 text-success",
  "Not interested": "bg-ink/10 text-muted",
};

const INPUT = "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary";
const LABEL = "text-xs font-bold uppercase tracking-wide text-muted-foreground";

/** Downloads the agents as a phone-book file (.vcf) that can be imported into a phone or Google Contacts. */
function downloadVcf(list: AgentRow[]) {
  const text = buildVcard(
    list.map((r) => ({
      name: r.agency ? `${r.name} (${r.agency})` : r.name,
      phones: [r.phone, r.whatsappRaw],
      org: r.agency || "5STAR.M Agent contact",
      note: r.area ? `Area: ${r.area}` : undefined,
    }))
  );
  const blob = new Blob([text], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `5starm-agents-${new Date().toISOString().slice(0, 10)}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ */
/* Add / edit form                                                     */
/* ------------------------------------------------------------------ */

function AgentFormModal({ agent, onClose }: { agent: AgentRow | null; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<AgentFormState, FormData>(saveAgentContactAction.bind(null, agent?.id ?? null), {});

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={agent ? "Edit agent" : "Add agent"}>
      <form action={formAction} className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-heading text-base font-extrabold text-ink">{agent ? "Edit agent" : "Add a real estate agent"}</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="a-name">
              Agent name *
            </label>
            <input id="a-name" name="name" required defaultValue={agent?.name} className={`mt-2 ${INPUT}`} autoFocus />
          </div>
          <div>
            <label className={LABEL} htmlFor="a-agency">
              Real estate name
            </label>
            <input id="a-agency" name="agency" defaultValue={agent?.agency} placeholder="e.g. Al-Madina Estate" className={`mt-2 ${INPUT}`} />
          </div>
          <div>
            <label className={LABEL} htmlFor="a-phone">
              Contact number *
            </label>
            <input id="a-phone" name="phone" required inputMode="tel" defaultValue={agent?.phone} placeholder="0300 1234567" className={`mt-2 ${INPUT}`} />
          </div>
          <div>
            <label className={LABEL} htmlFor="a-wa">
              WhatsApp number (if different)
            </label>
            <input id="a-wa" name="whatsapp" inputMode="tel" defaultValue={agent?.whatsappRaw} className={`mt-2 ${INPUT}`} />
          </div>
          <div>
            <label className={LABEL} htmlFor="a-area">
              Area (where they work)
            </label>
            <input id="a-area" name="area" defaultValue={agent?.area} placeholder="e.g. Johar Town, Wapda Town" className={`mt-2 ${INPUT}`} />
          </div>
          <div>
            <label className={LABEL} htmlFor="a-status">
              Status
            </label>
            <select id="a-status" name="status" defaultValue={agent?.status ?? "New"} className={`mt-2 ${INPUT}`}>
              {agentStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor="a-remarks">
              Remarks
            </label>
            <textarea id="a-remarks" name="remarks" rows={3} defaultValue={agent?.remarks} placeholder="Anything worth remembering - what they deal in, when to call, who referred them." className={`mt-2 ${INPUT}`} />
          </div>
          {state.error && <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary sm:col-span-2">{state.error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-full border border-border px-5 py-2 text-xs font-bold text-ink hover:bg-surface-muted">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
            {pending ? "Saving..." : agent ? "Save changes" : "Add agent"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add many at once                                                    */
/* ------------------------------------------------------------------ */

function ImportModal({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState<AgentFormState, FormData>(importAgentContactsAction, {});
  const finished = state.added !== undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Add many agents">
      <form action={formAction} className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-heading text-base font-extrabold text-ink">Add many agents at once</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <p className="text-sm text-muted">
            Paste one agent per line: <b>name, real estate name, number, area</b>. Only the name and number are needed, and the number can be anywhere in the line. Numbers that are
            already saved are skipped.
          </p>
          <pre className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink">{`Ahmed Ali, Al-Madina Estate, 0300 1234567, Johar Town
Bilal Khan 0321-1234567
+92 333 1234567 Usman Raza`}</pre>
          <textarea name="list" rows={9} required className={`${INPUT} font-mono`} placeholder="Paste the list here" disabled={finished && !state.error} />
          {state.error && <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">{state.error}</p>}
          {finished && state.added! > 0 && (
            <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm font-semibold text-success">
              {state.added} agent{state.added === 1 ? "" : "s"} added.
            </p>
          )}
          {state.skipped && state.skipped.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="font-bold">Left out ({state.skipped.length}):</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {state.skipped.slice(0, 20).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-full border border-border px-5 py-2 text-xs font-bold text-ink hover:bg-surface-muted">
            {finished && state.added ? "Done" : "Cancel"}
          </button>
          {!(finished && state.added) && (
            <button type="submit" disabled={pending} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
              {pending ? "Adding..." : "Add these agents"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

type Channel = "whatsapp" | "sms";

export function AgentContactsView({ rows, properties }: { rows: AgentRow[]; properties: AgentShareProperty[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgentStatus | "All">("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ agent: AgentRow | null } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [body, setBody] = useState(PRESETS[0].text);
  const [presetLabel, setPresetLabel] = useState(PRESETS[0].label);
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [propertyQuery, setPropertyQuery] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [statusOverride, setStatusOverride] = useState<Record<string, AgentStatus>>({});
  const [deleteError, setDeleteError] = useState("");
  const [, startTransition] = useTransition();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const status = statusOverride[r.id] ?? r.status;
      if (statusFilter !== "All" && status !== statusFilter) return false;
      if (!q) return true;
      return [r.name, r.agency, r.area, r.phone, r.whatsapp, r.remarks].join(" ").toLowerCase().includes(q);
    });
  }, [rows, query, statusFilter, statusOverride]);

  const allSelected = shown.length > 0 && shown.every((r) => selected.has(r.id));
  const chosen = useMemo(() => rows.filter((r) => selected.has(r.id)), [rows, selected]);
  const chosenProperties = propertyIds.map((id) => properties.find((p) => p.id === id)).filter((p): p is AgentShareProperty => Boolean(p));
  const statusCount = (s: AgentStatus) => rows.filter((r) => (statusOverride[r.id] ?? r.status) === s).length;

  const visibleProperties = useMemo(() => {
    const q = propertyQuery.trim().toLowerCase();
    const list = q ? properties.filter((p) => [p.serialNo, p.title, p.location, p.price].join(" ").toLowerCase().includes(q)) : properties;
    return list.slice(0, 40);
  }, [properties, propertyQuery]);

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

  function toggleProperty(id: string) {
    setPropertyIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= MAX_PROPERTIES ? ids : [...ids, id]));
  }

  function openPanelFor(ids: string[]) {
    setSelected(new Set(ids));
    setPanelOpen(true);
  }

  function changeStatus(id: string, status: AgentStatus) {
    setStatusOverride((o) => ({ ...o, [id]: status }));
    startTransition(async () => {
      const res = await setAgentStatusAction(id, status);
      if (!res.ok) setDeleteError(res.error ?? "Could not change the status.");
    });
  }

  function remove(r: AgentRow) {
    if (!window.confirm(`Delete ${r.name} from your agents? This cannot be undone.`)) return;
    setDeleteError("");
    startTransition(async () => {
      const res = await deleteAgentContactAction(r.id);
      if (!res.ok) setDeleteError(res.error ?? "Could not delete this agent.");
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
    chosenProperties.forEach((p, i) => {
      if (chosenProperties.length > 1) lines.push(`Property ${i + 1}`);
      lines.push(...p.lines, "");
    });
    lines.push(...companyDetailLines());
    return lines.join("\n");
  }

  function markSent(id: string, channel: Channel) {
    setSent((s) => new Set(s).add(`${id}:${channel}`));
    void logAgentMessagedAction(id, channel, chosenProperties.map((p) => p.title));
  }

  const preview = chosen[0] ? messageFor(chosen[0].name) : messageFor("(agent name)");

  return (
    <div>
      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, real estate, area or number" className={`${INPUT} pl-9`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
          >
            <ListPlus className="h-4 w-4" /> Add many
          </button>
          <button
            type="button"
            onClick={() => setForm({ agent: null })}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
          >
            <PlusCircle className="h-4 w-4" /> Add Agent
          </button>
        </div>
      </div>

      {/* Status filter */}
      <div className="mt-4 flex flex-wrap gap-2">
        {(["All", ...agentStatuses] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={statusFilter === s ? "rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-white" : "rounded-full border border-border px-4 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted"}
          >
            {s} ({s === "All" ? rows.length : statusCount(s)})
          </button>
        ))}
      </div>

      {/* Selection bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <p className="text-sm text-ink">
          <span className="font-bold">{selected.size}</span> selected
          {selected.size === 0 && <span className="text-muted"> - tick the agents you want to message</span>}
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
      {deleteError && <p className="mt-2 text-sm font-semibold text-primary">{deleteError}</p>}

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[1040px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all agents" className="h-4 w-4 accent-primary" />
              </th>
              <th className="px-4 py-3">Agent name</th>
              <th className="px-4 py-3">Real estate name</th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Contact number</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Remarks</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted">
                  {rows.length === 0 ? "No agents yet. Press Add Agent, or Add many to paste a whole list." : "No agent matches your search."}
                </td>
              </tr>
            )}
            {shown.map((r) => {
              const status = statusOverride[r.id] ?? r.status;
              return (
                <tr key={r.id} className={`border-b border-border align-top last:border-0 hover:bg-surface-muted/50 ${selected.has(r.id) ? "bg-primary/5" : ""}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} className="h-4 w-4 accent-primary" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{r.name}</div>
                    <div className="text-xs text-muted">
                      Added {r.added}
                      {r.lastContacted ? ` - last messaged ${r.lastContacted}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink">{r.agency || <span className="text-muted">-</span>}</td>
                  <td className="px-4 py-3 text-ink">{r.area || <span className="text-muted">-</span>}</td>
                  <td className="px-4 py-3">
                    <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 font-semibold text-ink hover:text-primary">
                      <Phone className="h-3.5 w-3.5" /> {r.phone}
                    </a>
                    {r.whatsappRaw && r.whatsappRaw !== r.phone && <div className="text-xs text-muted">WhatsApp: {r.whatsappRaw}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={status}
                      onChange={(e) => changeStatus(r.id, e.target.value as AgentStatus)}
                      aria-label={`Status of ${r.name}`}
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-bold outline-none ${STATUS_TONE[status]}`}
                    >
                      {agentStatuses.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-xs text-muted">
                    <span className="line-clamp-3 whitespace-pre-line">{r.remarks || "-"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openPanelFor([r.id])}
                      className="inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Message
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setForm({ agent: r })} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-ink" aria-label={`Edit ${r.name}`}>
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

      {form && <AgentFormModal key={form.agent?.id ?? "new"} agent={form.agent} onClose={() => setForm(null)} />}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}

      {/* Message selected */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Message selected agents">
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-heading text-base font-extrabold text-ink">
                Message {chosen.length} agent{chosen.length === 1 ? "" : "s"}
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
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setBody(p.text);
                          setPresetLabel(p.label);
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${presetLabel === p.label ? "border-primary bg-primary/10 text-primary" : "border-border text-ink hover:border-primary hover:text-primary"}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className={`mt-2 ${INPUT}`} placeholder="Write your message" />
                  <p className="mt-1 text-[11px] text-muted">Each agent&apos;s name goes at the top and our company details at the bottom automatically.</p>
                </div>

                <div>
                  <p className={LABEL}>Send properties (optional, up to {MAX_PROPERTIES})</p>
                  <input value={propertyQuery} onChange={(e) => setPropertyQuery(e.target.value)} placeholder="Search by serial number, title or area" className={`mt-2 ${INPUT}`} />
                  <ul className="mt-2 max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                    {visibleProperties.length === 0 && <li className="px-3 py-3 text-xs text-muted">No available property matches.</li>}
                    {visibleProperties.map((p) => {
                      const on = propertyIds.includes(p.id);
                      const full = !on && propertyIds.length >= MAX_PROPERTIES;
                      return (
                        <li key={p.id}>
                          <label className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-xs ${full ? "opacity-40" : "hover:bg-surface-muted/60"}`}>
                            <input type="checkbox" checked={on} disabled={full} onChange={() => toggleProperty(p.id)} className="mt-0.5 h-4 w-4 accent-primary" />
                            <span className="min-w-0">
                              <span className="line-clamp-2 font-semibold text-ink">{p.title}</span>
                              <span className="font-mono text-[10px] font-bold text-muted">{p.serialNo}</span>
                              <span className="text-muted"> - {p.price}</span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  {chosenProperties.length > 0 && (
                    <p className="mt-1 text-[11px] text-muted">
                      {chosenProperties.length} selected.{" "}
                      <button type="button" onClick={() => setPropertyIds([])} className="font-bold text-primary hover:underline">
                        Clear
                      </button>
                    </p>
                  )}
                </div>

                <div>
                  <p className={LABEL}>What the agent will see</p>
                  <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#dcf8c6] p-3 font-sans text-xs text-[#111]">{preview}</pre>
                </div>
              </div>

              <div>
                <p className={LABEL}>Send to each agent</p>
                <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                  {chosen.map((r) => {
                    const waDone = sent.has(`${r.id}:whatsapp`);
                    const smsDone = sent.has(`${r.id}:sms`);
                    const text = messageFor(r.name);
                    return (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{r.name}</p>
                          <p className="truncate text-xs text-muted">{[r.agency, r.whatsapp].filter(Boolean).join(" - ")}</p>
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
                  WhatsApp opens one agent at a time with the message already written - you press send inside WhatsApp. This keeps your number safe: WhatsApp blocks numbers that
                  send the same text to many people automatically. SMS opens the messaging app, so use it from a phone.
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
