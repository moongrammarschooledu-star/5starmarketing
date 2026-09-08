"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, Phone, Mail } from "lucide-react";
import type { Inquiry, LeadStatus } from "@/lib/models/inquiry";
import { leadStatuses } from "@/lib/models/inquiry";
import { updateInquiryStatusAction, deleteInquiryAction } from "@/lib/actions/inquiries.actions";
import { StatusBadge } from "./StatusBadge";
import { ConfirmDialog, useConfirmDelete } from "./ConfirmDialog";
import { useToast } from "./ToastProvider";
import { Modal } from "./Modal";

const ALL = "All";

export function InquiriesTable({ inquiries }: { inquiries: Inquiry[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [viewing, setViewing] = useState<Inquiry | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const del = useConfirmDelete<Inquiry>(async (id) => {
    await deleteInquiryAction(id);
    toast.show("Inquiry deleted.");
    router.refresh();
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inquiries.filter((i) => {
      if (
        q &&
        !i.name.toLowerCase().includes(q) &&
        !i.phone.includes(q) &&
        !(i.propertyTitle ?? "").toLowerCase().includes(q)
      )
        return false;
      if (status !== ALL && i.status !== status) return false;
      return true;
    });
  }, [inquiries, search, status]);

  function changeStatus(id: string, next: LeadStatus) {
    startTransition(async () => {
      await updateInquiryStatusAction(id, next);
      toast.show("Lead status updated.");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or property..."
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
      </div>

      <p className="mt-4 text-sm font-medium text-muted">
        Showing {filtered.length} of {inquiries.length} inquiries
      </p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No inquiries match those filters.
                </td>
              </tr>
            )}
            {filtered.map((i) => (
              <tr key={i.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3 font-semibold text-ink">{i.name}</td>
                <td className="px-4 py-3 text-muted">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" /> {i.phone}
                  </div>
                  {i.email && (
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-primary" /> {i.email}
                    </div>
                  )}
                </td>
                <td className="max-w-[180px] px-4 py-3 text-muted">
                  <span className="line-clamp-1">{i.propertyTitle ?? "General"}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={i.source} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                  {new Date(i.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={i.status}
                    disabled={isPending}
                    onChange={(e) => changeStatus(i.id, e.target.value as LeadStatus)}
                    className="rounded-full border border-border bg-surface px-2 py-1 text-xs font-bold text-ink outline-none focus:border-primary"
                  >
                    {leadStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setViewing(i)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-muted hover:border-primary hover:text-primary"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => del.open(i)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                      aria-label="Delete"
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

      <ConfirmDialog
        open={!!del.target}
        message="Are you sure you want to delete this inquiry? This cannot be undone."
        confirmLabel="Delete Inquiry"
        busy={del.busy}
        onConfirm={del.confirm}
        onClose={del.close}
      />

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Inquiry Details">
        {viewing && (
          <div className="space-y-3 text-sm">
            <Row label="Customer" value={viewing.name} />
            <Row label="Phone" value={viewing.phone} />
            {viewing.email && <Row label="Email" value={viewing.email} />}
            <Row label="Property" value={viewing.propertyTitle ?? "General inquiry"} />
            <Row label="Source" value={viewing.source} />
            <Row
              label="Date"
              value={new Date(viewing.createdAt).toLocaleString("en-GB")}
            />
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Message</div>
              <p className="mt-1 rounded-lg bg-surface-muted p-3 text-sm text-ink">{viewing.message}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
