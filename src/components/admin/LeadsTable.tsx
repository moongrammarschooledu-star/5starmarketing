"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Trash2, Phone, Mail, MessageCircle, Eye, Pencil, SlidersHorizontal, AlertTriangle } from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/models/lead";
import { leadStatuses, leadSources } from "@/lib/models/lead";
import { updateLeadStatusAction, deleteLeadAction } from "@/lib/actions/leads.actions";
import { whatsappLink } from "@/lib/site";
import { StatusBadge } from "./StatusBadge";
import { ConfirmDialog, useConfirmDelete } from "./ConfirmDialog";
import { useToast } from "./ToastProvider";

const ALL = "All";

function whatsappNumberFor(lead: Lead) {
  return (lead.whatsapp || lead.phone || "").replace(/[^0-9+]/g, "");
}

function inquiryMessage(lead: Lead) {
  const property = lead.propertyTitle ? ` in ${lead.propertyTitle}` : "";
  return `Assalam-o-Alaikum ${lead.name},\n\nThank you for your interest${property}. This is 5STAR.M Estate & Builders — how can we help you today?`;
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [source, setSource] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const del = useConfirmDelete<Lead>(async (id) => {
    await deleteLeadAction(id);
    toast.show("Lead deleted.");
    router.refresh();
  });

  // Duplicate detection: any phone/WhatsApp number shared by more than one
  // *distinct* lead is flagged — the admin decides what to do, nothing
  // auto-merges. Numbers are deduped per-lead first so a lead whose phone
  // and WhatsApp are the same value doesn't flag itself as a duplicate.
  const numberToLeadIds = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const l of leads) {
      const ownNumbers = new Set(
        [l.phone, l.whatsapp]
          .map((n) => (n || "").replace(/[^0-9]/g, ""))
          .filter((key) => key.length >= 6)
      );
      for (const key of ownNumbers) {
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(l.id);
      }
    }
    return map;
  }, [leads]);

  function isDuplicate(lead: Lead) {
    const ownNumbers = new Set(
      [lead.phone, lead.whatsapp]
        .map((n) => (n || "").replace(/[^0-9]/g, ""))
        .filter((key) => key.length >= 6)
    );
    for (const key of ownNumbers) {
      if ((numberToLeadIds.get(key)?.size ?? 0) > 1) return true;
    }
    return false;
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (
        q &&
        !l.name.toLowerCase().includes(q) &&
        !l.phone.includes(q) &&
        !(l.email ?? "").toLowerCase().includes(q) &&
        !(l.propertyTitle ?? "").toLowerCase().includes(q)
      )
        return false;
      if (status !== ALL && l.status !== status) return false;
      if (source !== ALL && l.source !== source) return false;
      if (dateFrom && l.createdAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && l.createdAt.slice(0, 10) > dateTo) return false;
      if (followUpDate && l.nextFollowUpDate !== followUpDate) return false;
      return true;
    });
  }, [leads, search, status, source, dateFrom, dateTo, followUpDate]);

  function changeStatus(id: string, next: LeadStatus) {
    startTransition(async () => {
      await updateLeadStatusAction(id, next);
      toast.show("Lead status updated.");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email or property..."
              className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-primary"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary"
          >
            {[ALL, ...leadStatuses].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
          >
            <SlidersHorizontal className="h-4 w-4" /> More Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
              Source
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-medium text-ink outline-none focus:border-primary"
              >
                {[ALL, ...leadSources].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
              Date From
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
              Date To
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
              Follow-Up Date
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary"
              />
            </label>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm font-medium text-muted">
        Showing {filtered.length} of {leads.length} leads
      </p>

      {/* Desktop table */}
      <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-border bg-surface lg:block">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  No leads match those filters.
                </td>
              </tr>
            )}
            {filtered.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3 font-semibold text-ink">
                  <div className="flex items-center gap-1.5">
                    {l.name}
                    {isDuplicate(l) && (
                      <span
                        title="Possible duplicate lead"
                        className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600"
                      >
                        <AlertTriangle className="h-3 w-3" /> Duplicate
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" /> {l.phone}
                  </div>
                  {l.email && (
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-primary" /> {l.email}
                    </div>
                  )}
                </td>
                <td className="max-w-[180px] px-4 py-3 text-muted">
                  <span className="line-clamp-1">{l.propertyTitle ?? "General"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-bold text-ink">{l.source}</span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={l.status}
                    disabled={isPending}
                    onChange={(e) => changeStatus(l.id, e.target.value as LeadStatus)}
                    className="rounded-full border border-border bg-surface px-2 py-1 text-xs font-bold text-ink outline-none focus:border-primary"
                  >
                    {leadStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                  {new Date(l.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3 text-xs text-muted">{l.assignedTo || "Unassigned"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/admin/leads/${l.id}`}
                      title="View"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/admin/leads/${l.id}`}
                      title="Edit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <a
                      href={whatsappLink(inquiryMessage(l))}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-success hover:border-success"
                      style={{ pointerEvents: whatsappNumberFor(l) ? "auto" : "none", opacity: whatsappNumberFor(l) ? 1 : 0.4 }}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                    <a
                      href={`tel:${l.phone}`}
                      title="Call"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => del.open(l)}
                      title="Delete"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-3 space-y-3 lg:hidden">
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
            No leads match those filters.
          </p>
        )}
        {filtered.map((l) => (
          <div key={l.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-ink">
                  {l.name}
                  {isDuplicate(l) && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                      <AlertTriangle className="h-3 w-3" /> Dup
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-muted">{l.propertyTitle ?? "General inquiry"}</div>
              </div>
              <StatusBadge status={l.status} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-primary" /> {l.phone}</span>
              {l.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-primary" /> {l.email}</span>}
              <span className="rounded-full bg-ink/5 px-2 py-0.5 font-bold text-ink">{l.source}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={whatsappLink(inquiryMessage(l))}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-full bg-success px-3 py-2 text-xs font-bold text-white"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
              <a
                href={`tel:${l.phone}`}
                className="flex items-center justify-center gap-1.5 rounded-full border-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink"
              >
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <select
                value={l.status}
                disabled={isPending}
                onChange={(e) => changeStatus(l.id, e.target.value as LeadStatus)}
                className="flex-1 rounded-full border border-border bg-surface px-2.5 py-2 text-xs font-bold text-ink outline-none focus:border-primary"
              >
                {leadStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <Link
                href={`/admin/leads/${l.id}`}
                className="rounded-full border-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink"
              >
                View
              </Link>
              <button
                type="button"
                onClick={() => del.open(l)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink/15 text-muted"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!del.target}
        message="Are you sure you want to delete this lead? This cannot be undone."
        confirmLabel="Delete Lead"
        busy={del.busy}
        onConfirm={del.confirm}
        onClose={del.close}
      />
    </div>
  );
}

