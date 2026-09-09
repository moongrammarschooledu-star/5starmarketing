"use client";

import { useState } from "react";
import { List, Kanban } from "lucide-react";
import type { Lead } from "@/lib/models/lead";
import { LeadsTable } from "./LeadsTable";
import { LeadPipeline } from "./LeadPipeline";

export function LeadsViewSwitcher({ leads }: { leads: Lead[] }) {
  const [view, setView] = useState<"table" | "pipeline">("table");

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setView("table")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
            view === "table" ? "bg-primary text-primary-foreground" : "border-2 border-ink/15 text-ink"
          }`}
        >
          <List className="h-3.5 w-3.5" /> Table
        </button>
        <button
          type="button"
          onClick={() => setView("pipeline")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
            view === "pipeline" ? "bg-primary text-primary-foreground" : "border-2 border-ink/15 text-ink"
          }`}
        >
          <Kanban className="h-3.5 w-3.5" /> Pipeline
        </button>
      </div>

      {view === "table" ? <LeadsTable leads={leads} /> : <LeadPipeline leads={leads} />}
    </div>
  );
}
