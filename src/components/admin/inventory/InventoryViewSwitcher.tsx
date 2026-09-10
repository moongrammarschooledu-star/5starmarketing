"use client";

import { useState } from "react";
import { Table2, Grid3x3 } from "lucide-react";
import type { InventoryUnit } from "@/lib/models/inventory";
import { InventoryMatrix } from "./InventoryMatrix";
import { InventoryPlotGrid } from "./InventoryPlotGrid";

export function InventoryViewSwitcher({ units }: { units: InventoryUnit[] }) {
  const [view, setView] = useState<"matrix" | "grid">("matrix");

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setView("matrix")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${view === "matrix" ? "bg-primary text-primary-foreground" : "border-2 border-ink/15 text-ink"}`}
        >
          <Table2 className="h-3.5 w-3.5" /> Matrix
        </button>
        <button
          type="button"
          onClick={() => setView("grid")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "border-2 border-ink/15 text-ink"}`}
        >
          <Grid3x3 className="h-3.5 w-3.5" /> Grid
        </button>
      </div>

      <div className="mt-4">{view === "matrix" ? <InventoryMatrix units={units} /> : <InventoryPlotGrid units={units} />}</div>
    </div>
  );
}
