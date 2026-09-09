"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Trash2, Eye, MessageCircle, SlidersHorizontal } from "lucide-react";
import type { Appointment } from "@/lib/models/appointment";
import { appointmentStatuses } from "@/lib/models/appointment";
import { updateAppointmentStatusAction, deleteAppointmentAction } from "@/lib/actions/appointments.actions";
import { whatsappUrlFor } from "@/lib/site";
import { StatusBadge } from "./StatusBadge";
import { ConfirmDialog, useConfirmDelete } from "./ConfirmDialog";
import { useToast } from "./ToastProvider";

const ALL = "All";

export function AppointmentsTable({ appointments }: { appointments: Appointment[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [date, setDate] = useState("");
  const [property, setProperty] = useState<string>(ALL);
  const [agent, setAgent] = useState<string>(ALL);
  const [showFilters, setShowFilters] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const del = useConfirmDelete<Appointment>(async (id) => {
    await deleteAppointmentAction(id);
    toast.show("Appointment deleted.");
    router.refresh();
  });

  const properties = useMemo(() => [...new Set(appointments.map((a) => a.propertyTitle))].sort(), [appointments]);
  const agents = useMemo(
    () => [...new Set(appointments.filter((a) => a.assignedAgent).map((a) => a.assignedAgent as string))].sort(),
    [appointments]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q) && !a.phone.includes(q) && !a.propertyTitle.toLowerCase().includes(q)) return false;
      if (status !== ALL && a.status !== status) return false;
      if (date && a.appointmentDate !== date) return false;
      if (property !== ALL && a.propertyTitle !== property) return false;
      if (agent !== ALL && a.assignedAgent !== agent) return false;
      return true;
    });
  }, [appointments, search, status, date, property, agent]);

  function changeStatus(id: string, next: Appointment["status"]) {
    startTransition(async () => {
      await updateAppointmentStatusAction(id, next);
      toast.show("Appointment updated.");
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
              placeholder="Search by name, phone or property..."
              className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-primary"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary"
          >
            {[ALL, ...appointmentStatuses].map((s) => (
              <option key={s} value={s}>{s}</option>
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
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
              Property
              <select
                value={property}
                onChange={(e) => setProperty(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-medium text-ink outline-none focus:border-primary"
              >
                {[ALL, ...properties].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
              Assigned Agent
              <select
                value={agent}
                onChange={(e) => setAgent(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-medium text-ink outline-none focus:border-primary"
              >
                {[ALL, ...agents].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm font-medium text-muted">
        Showing {filtered.length} of {appointments.length} appointments
      </p>

      {/* Desktop table */}
      <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-border bg-surface lg:block">
        <table className="w-full min-w-[1080px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted">No appointments match those filters.</td>
              </tr>
            )}
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3 font-semibold text-ink">{a.name}</td>
                <td className="px-4 py-3 text-muted">{a.phone}</td>
                <td className="max-w-[160px] px-4 py-3 text-muted"><span className="line-clamp-1">{a.propertyTitle}</span></td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{a.appointmentDate}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{a.appointmentTime}</td>
                <td className="px-4 py-3">
                  <select
                    value={a.status}
                    disabled={isPending}
                    onChange={(e) => changeStatus(a.id, e.target.value as Appointment["status"])}
                    className="rounded-full border border-border bg-surface px-2 py-1 text-xs font-bold text-ink outline-none focus:border-primary"
                  >
                    {appointmentStatuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-muted">{a.assignedAgent || "Unassigned"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                  {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/admin/appointments/${a.id}`}
                      title="View"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <a
                      href={whatsappUrlFor(a.whatsapp || a.phone, `Assalam-o-Alaikum ${a.name}, this is 5STAR.M regarding your site visit for ${a.propertyTitle}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-success hover:border-success"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => del.open(a)}
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
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">No appointments match those filters.</p>
        )}
        {filtered.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-ink">{a.name}</div>
                <div className="mt-0.5 text-xs text-muted">{a.propertyTitle}</div>
              </div>
              <StatusBadge status={a.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
              <span>{a.appointmentDate}</span>
              <span>{a.appointmentTime}</span>
              <span>{a.assignedAgent || "Unassigned"}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <select
                value={a.status}
                disabled={isPending}
                onChange={(e) => changeStatus(a.id, e.target.value as Appointment["status"])}
                className="flex-1 rounded-full border border-border bg-surface px-2.5 py-2 text-xs font-bold text-ink outline-none focus:border-primary"
              >
                {appointmentStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <Link href={`/admin/appointments/${a.id}`} className="rounded-full border-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink">
                View
              </Link>
              <button
                type="button"
                onClick={() => del.open(a)}
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
        message="Are you sure you want to delete this appointment? This cannot be undone."
        confirmLabel="Delete Appointment"
        busy={del.busy}
        onConfirm={del.confirm}
        onClose={del.close}
      />
    </div>
  );
}
