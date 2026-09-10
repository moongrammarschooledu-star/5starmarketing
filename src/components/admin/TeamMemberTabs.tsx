"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";

const TABS = ["Overview", "Leads", "Appointments", "Activity"] as const;
type Tab = (typeof TABS)[number];

export function TeamMemberTabs({
  overview,
  leads,
  appointments,
  activity,
}: {
  overview: ReactNode;
  leads: ReactNode;
  appointments: ReactNode;
  activity: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const content: Record<Tab, ReactNode> = { Overview: overview, Leads: leads, Appointments: appointments, Activity: activity };

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto rounded-full border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={clsx(
              "shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors",
              tab === t ? "bg-primary text-primary-foreground" : "text-muted hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-4">{content[tab]}</div>
    </div>
  );
}
