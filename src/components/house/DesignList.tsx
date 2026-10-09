"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { deleteHouseDesignAction, duplicateHouseDesignAction } from "@/lib/actions/houseDesign.actions";
import type { HouseDesign } from "@/lib/house/types";

function when(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "numeric" });
}

export function DesignList({ designs }: { designs: HouseDesign[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const copy = (id: string) =>
    startTransition(async () => {
      const result = await duplicateHouseDesignAction(id);
      if (!result.ok) setError(result.error ?? "Could not copy the design.");
      else router.refresh();
    });

  const remove = (d: HouseDesign) => {
    if (!confirm(`Delete "${d.name}" permanently?`)) return;
    startTransition(async () => {
      const result = await deleteHouseDesignAction(d.id);
      if (!result.ok) setError(result.error ?? "Could not delete the design.");
      else router.refresh();
    });
  };

  if (designs.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted">No designs yet. Start with &quot;New Design&quot;.</p>;
  }

  return (
    <div>
      {error && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">{error}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {designs.map((d) => {
          const rooms = d.data.floors.reduce((n, f) => n + f.rooms.length, 0);
          return (
            <div key={d.id} className="flex flex-col rounded-2xl border border-border bg-surface p-5">
              <Link href={`/admin/house-designer/${d.id}`} className="font-heading text-base font-bold text-ink hover:text-primary">
                {d.name}
              </Link>
              {d.clientName && <p className="mt-0.5 text-xs font-semibold text-muted">Client: {d.clientName}</p>}
              <p className="mt-2 text-sm text-ink">
                {d.data.plot.width} x {d.data.plot.length} ft - {d.data.floors.length} floor{d.data.floors.length > 1 ? "s" : ""} - {rooms} room{rooms === 1 ? "" : "s"}
              </p>
              {d.constructionProjectName && <p className="mt-1 text-xs text-primary">{d.constructionProjectName}</p>}
              <p className="mt-1 text-xs text-muted">Updated {when(d.updatedAt)}</p>
              <div className="mt-4 flex items-center gap-2">
                <Link href={`/admin/house-designer/${d.id}`} className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
                  Open
                </Link>
                <button type="button" onClick={() => copy(d.id)} disabled={pending} className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:border-primary disabled:opacity-50">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button type="button" onClick={() => remove(d)} disabled={pending} className="ml-auto flex items-center gap-1 rounded-full border-2 border-danger/30 px-3 py-1.5 text-xs font-bold text-danger disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
