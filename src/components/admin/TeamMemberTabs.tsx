"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";

const BASE_TABS = ["Overview", "Leads", "Appointments", "Activity"] as const;
const FINANCIALS_TAB = "Financials" as const;

export function TeamMemberTabs({
  overview,
  leads,
  appointments,
  activity,
  financials,
}: {
  overview: ReactNode;
  leads: ReactNode;
  appointments: ReactNode;
  activity: ReactNode;
  /** Agent Financial Tab (STEP 23, section 52) — omitted entirely for
   *  roles not authorized to see commission/sales-value figures,
   *  rather than rendered-but-empty. */
  financials?: ReactNode;
}) {
  const tabs = financials ? [...BASE_TABS, FINANCIALS_TAB] : BASE_TABS;
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const content: Record<string, ReactNode> = { Overview: overview, Leads: leads, Appointments: appointments, Activity: activity, Financials: financials };

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto rounded-full border border-border bg-surface p-1">
        {tabs.map((t) => (
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
