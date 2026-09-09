"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  Users,
  FolderKanban,
  Wrench,
  Settings,
  UserCircle,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { logoutAction } from "@/lib/actions/auth.actions";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/properties", label: "Properties", icon: Building2 },
  { href: "/admin/properties/new", label: "Add Property", icon: PlusCircle },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/services", label: "Services", icon: Wrench },
  { href: "/admin/settings", label: "Website Settings", icon: Settings },
  { href: "/admin/profile", label: "Admin Profile", icon: UserCircle },
];

export function AdminSidebar({
  onNavigate,
  newLeadsCount = 0,
}: {
  onNavigate?: () => void;
  newLeadsCount?: number;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Logo light />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
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
