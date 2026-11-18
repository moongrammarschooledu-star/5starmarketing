import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

/** Title, short help and a back link around one stationery tool. */
export function StationeryShell({ title, help, children }: { title: string; help: string; children: ReactNode }) {
  return (
    <div>
      <Link href="/admin/stationery" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">{title}</h1>
      <p className="mt-1 text-sm text-muted">{help}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
