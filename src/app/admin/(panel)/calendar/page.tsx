import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { appointmentService } from "@/services/appointmentService";
import { requireSection } from "@/lib/guard";
import type { Appointment } from "@/lib/models/appointment";

export const dynamic = "force-dynamic";

type View = "month" | "week" | "day";

const STATUS_DOT: Record<string, string> = {
  Pending: "bg-primary",
  Confirmed: "bg-success",
  Rescheduled: "bg-amber-500",
  Completed: "bg-ink",
  Cancelled: "bg-muted-foreground",
  "No Show": "bg-muted-foreground",
};

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return monday;
}

function viewHref(view: View, date: string) {
  return `/admin/calendar?view=${view}&date=${date}`;
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  await requireSection("appointments");
  const sp = await searchParams;
  const view: View = sp.view === "week" || sp.view === "day" ? sp.view : "month";
  const anchor = sp.date ? new Date(`${sp.date}T00:00:00`) : new Date();
  const anchorISO = toISO(anchor);

  let rangeFrom: string;
  let rangeTo: string;
  if (view === "day") {
    rangeFrom = anchorISO;
    rangeTo = anchorISO;
  } else if (view === "week") {
    const start = startOfWeek(anchor);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    rangeFrom = toISO(start);
    rangeTo = toISO(end);
  } else {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    rangeFrom = toISO(start);
    rangeTo = toISO(end);
  }

  let appointments: Appointment[] = [];
  try {
    const all = await appointmentService.listAll();
    appointments = all.filter((a) => a.appointmentDate >= rangeFrom && a.appointmentDate <= rangeTo);
  } catch (e) {
    console.error("AdminCalendarPage failed to load appointments:", e);
  }

  const byDate = new Map<string, Appointment[]>();
  for (const a of appointments) {
    if (!byDate.has(a.appointmentDate)) byDate.set(a.appointmentDate, []);
    byDate.get(a.appointmentDate)!.push(a);
  }

  function shiftDate(days: number) {
    const d = new Date(anchor);
    d.setDate(d.getDate() + days);
    return toISO(d);
  }
  const step = view === "month" ? 31 : view === "week" ? 7 : 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-ink">Appointment Calendar</h1>
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface p-1">
          {(["month", "week", "day"] as View[]).map((v) => (
            <Link
              key={v}
              href={viewHref(v, anchorISO)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                view === v ? "bg-primary text-primary-foreground" : "text-muted hover:text-ink"
              }`}
            >
              {v}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Link href={viewHref(view, shiftDate(-step))} className="flex items-center gap-1 rounded-full border-2 border-ink/15 px-3 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary">
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </Link>
        <div className="text-sm font-bold text-ink">
          {view === "month"
            ? anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
            : view === "week"
              ? `${rangeFrom} – ${rangeTo}`
              : anchorISO}
        </div>
        <Link href={viewHref(view, shiftDate(step))} className="flex items-center gap-1 rounded-full border-2 border-ink/15 px-3 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary">
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {Object.entries(STATUS_DOT).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${color}`} /> {status}
          </span>
        ))}
      </div>

      {view === "month" && <MonthGrid anchor={anchor} byDate={byDate} />}
      {view === "week" && <WeekGrid rangeFrom={rangeFrom} byDate={byDate} />}
      {view === "day" && <DayList date={anchorISO} appointments={byDate.get(anchorISO) ?? []} />}
    </div>
  );
}

function AppointmentChip({ appointment }: { appointment: Appointment }) {
  return (
    <Link
      href={`/admin/appointments/${appointment.id}`}
      className="flex items-center gap-1.5 rounded-md bg-surface-muted px-1.5 py-1 text-[11px] font-semibold text-ink hover:bg-primary/10"
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[appointment.status] ?? "bg-muted"}`} />
      <span className="truncate">{appointment.appointmentTime} {appointment.name}</span>
    </Link>
  );
}

function MonthGrid({ anchor, byDate }: { anchor: Date; byDate: Map<string, Appointment[]> }) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => toISO(new Date(year, month, i + 1)))];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="mt-4 grid grid-cols-7 gap-1.5 overflow-x-auto">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
        <div key={d} className="px-1 text-center text-[11px] font-bold uppercase text-muted-foreground">{d}</div>
      ))}
      {cells.map((dateISO, i) => (
        <div key={i} className="min-h-[90px] rounded-lg border border-border bg-surface p-1.5">
          {dateISO && (
            <>
              <div className="text-[11px] font-bold text-muted-foreground">{Number(dateISO.slice(8, 10))}</div>
              <div className="mt-1 space-y-1">
                {(byDate.get(dateISO) ?? []).slice(0, 3).map((a) => (
                  <AppointmentChip key={a.id} appointment={a} />
                ))}
                {(byDate.get(dateISO)?.length ?? 0) > 3 && (
                  <div className="text-[10px] text-muted-foreground">+{(byDate.get(dateISO)?.length ?? 0) - 3} more</div>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function WeekGrid({ rangeFrom, byDate }: { rangeFrom: string; byDate: Map<string, Appointment[]> }) {
  const start = new Date(`${rangeFrom}T00:00:00`);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toISO(d);
  });
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((dateISO) => (
        <div key={dateISO} className="rounded-lg border border-border bg-surface p-2.5">
          <div className="text-xs font-bold text-ink">{dateISO}</div>
          <div className="mt-1.5 space-y-1">
            {(byDate.get(dateISO) ?? []).length === 0 && <p className="text-[11px] text-muted-foreground">No visits</p>}
            {(byDate.get(dateISO) ?? []).map((a) => (
              <AppointmentChip key={a.id} appointment={a} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DayList({ date, appointments }: { date: string; appointments: Appointment[] }) {
  const sorted = [...appointments].sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-heading text-sm font-bold text-ink">{date}</h2>
      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No site visits scheduled for this day.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {sorted.map((a) => (
            <Link
              key={a.id}
              href={`/admin/appointments/${a.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 hover:border-primary/30"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[a.status] ?? "bg-muted"}`} />
                <span className="font-bold text-ink">{a.appointmentTime}</span>
                <span className="text-sm text-muted">{a.name} — {a.propertyTitle}</span>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">{a.status}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
