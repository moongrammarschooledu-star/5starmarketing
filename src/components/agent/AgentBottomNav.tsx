"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Building2, ListChecks, UserCircle } from "lucide-react";
import clsx from "clsx";

const ITEMS = [
  { href: "/agent/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agent/leads", label: "Leads", icon: Users },
  { href: "/agent/properties", label: "Properties", icon: Building2 },
  { href: "/agent/tasks", label: "Tasks", icon: ListChecks },
  { href: "/admin/profile", label: "Profile", icon: UserCircle },
];

/** Mobile-only bottom tab bar for the Agent Mobile App (STEP 31,
 *  section 5). Everything beyond these five lives in the drawer menu
 *  (see AgentShell's full NAV list). */
export function AgentBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Primary"
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors",
              active ? "text-primary" : "text-muted"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
