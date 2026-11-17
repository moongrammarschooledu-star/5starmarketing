"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Printer } from "lucide-react";

/** "Print list" button on the Properties page: choose sale / rent / both and available / all,
 *  then download the short list (name, area, demand, size, owner number) as a PDF to print. */
export function PrintListMenu() {
  const [open, setOpen] = useState(false);
  const [which, setWhich] = useState<"all" | "sale" | "rent">("all");
  const [statusAll, setStatusAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function away(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const href = `/admin/properties/list-pdf?purpose=${which}&status=${statusAll ? "all" : "available"}`;
  const radio = "h-4 w-4 accent-primary";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-xs font-bold text-ink hover:border-primary hover:text-primary"
      >
        <Printer className="h-4 w-4" /> Print short list <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-border bg-surface p-4 shadow-xl">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Which properties</p>
          <div className="mt-2 space-y-1.5 text-sm text-ink">
            {(
              [
                ["all", "Sale and rent"],
                ["sale", "For sale only"],
                ["rent", "For rent only"],
              ] as const
            ).map(([v, label]) => (
              <label key={v} className="flex items-center gap-2">
                <input type="radio" name="print-which" checked={which === v} onChange={() => setWhich(v)} className={radio} /> {label}
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Status</p>
          <div className="mt-2 space-y-1.5 text-sm text-ink">
            <label className="flex items-center gap-2">
              <input type="radio" name="print-status" checked={!statusAll} onChange={() => setStatusAll(false)} className={radio} /> Available only
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="print-status" checked={statusAll} onChange={() => setStatusAll(true)} className={radio} /> All (including sold, reserved, inactive)
            </label>
          </div>
          <a
            href={href}
            download
            onClick={() => setOpen(false)}
            className="mt-4 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
          >
            <Printer className="h-4 w-4" /> Download PDF to print
          </a>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">Name, area, demand, size and the owner&apos;s contact number. For office use - it has private numbers.</p>
        </div>
      )}
    </div>
  );
}
