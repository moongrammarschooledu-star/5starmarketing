"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  Users,
  MessageCircle,
  FolderKanban,
  Wrench,
  Settings,
  Search,
  UserCircle,
  LogOut,
  ClipboardList,
  History,
  Users2,
  CalendarClock,
  CalendarDays,
  FileText,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { logoutAction } from "@/lib/actions/auth.actions";
import { canAccess, type AdminSection } from "@/lib/permissions";
import type { AdminRole } from "@/lib/models/user";

const navItems: { href: string; label: string; icon: typeof LayoutDashboard; section: AdminSection }[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "dashboard" },
  { href: "/admin/properties", label: "Properties", icon: Building2, section: "properties" },
  { href: "/admin/properties/new", label: "Add Property", icon: PlusCircle, section: "properties" },
  { href: "/admin/leads", label: "Leads", icon: Users, section: "leads" },
  { href: "/admin/customers", label: "Customers", icon: Users2, section: "customers" },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarClock, section: "appointments" },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays, section: "appointments" },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle, section: "whatsapp" },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban, section: "projects" },
  { href: "/admin/brochures", label: "Brochures", icon: FileText, section: "brochures" },
  { href: "/admin/services", label: "Services", icon: Wrench, section: "services" },
  { href: "/admin/reports", label: "Reports", icon: ClipboardList, section: "reports" },
  { href: "/admin/activity", label: "Activity Log", icon: History, section: "activity" },
  { href: "/admin/seo", label: "SEO", icon: Search, section: "seo" },
  { href: "/admin/settings", label: "Website Settings", icon: Settings, section: "settings" },
  { href: "/admin/profile", label: "Admin Profile", icon: UserCircle, section: "profile" },
];

export function AdminSidebar({
  onNavigate,
  newLeadsCount = 0,
  role,
}: {
  onNavigate?: () => void;
  newLeadsCount?: number;
  role: AdminRole;
}) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => canAccess(role, item.section));

  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Logo light />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const active =
              item.href === "/admin/properties"
                ? pathname === "/admin/properties"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors",
                    active ? "bg-primary text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  {item.label}
                  {item.href === "/admin/leads" && newLeadsCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                      {newLeadsCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-3">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}
