"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { slug: "overview", label: "Overview" },
  { slug: "phases", label: "Phases" },
  { slug: "tasks", label: "Tasks" },
  { slug: "progress", label: "Progress" },
  { slug: "boq", label: "BOQ" },
  { slug: "materials", label: "Materials" },
  { slug: "procurement", label: "Procurement" },
  { slug: "contractors", label: "Contractors" },
  { slug: "labor", label: "Labor" },
  { slug: "equipment", label: "Equipment" },
  { slug: "expenses", label: "Budget & Expenses" },
  { slug: "payments", label: "Payments" },
  { slug: "documents", label: "Documents" },
  { slug: "inspections", label: "Site Reports" },
  { slug: "quality", label: "Quality" },
  { slug: "safety", label: "Safety" },
  { slug: "change-orders", label: "Change Orders" },
  { slug: "reports", label: "Reports" },
];

export function ConstructionProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  return (
    <div className="overflow-x-auto border-b border-border">
      <div className="flex min-w-max gap-1">
        {TABS.map((tab) => {
          const href = `/admin/construction/projects/${projectId}/${tab.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={tab.slug}
              href={href}
              className={clsx("whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-bold transition-colors", active ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink")}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
