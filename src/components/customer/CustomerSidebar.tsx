"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Building2,
  Heart,
  Scale,
  MessageSquare,
  CalendarClock,
  BookmarkCheck,
  UserCircle,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { customerLogoutAction } from "@/lib/actions/customerAuth.actions";

const navItems = [
  { href: "/customer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/customer/favorites", label: "Favorites", icon: Heart },
  { href: "/compare", label: "Compare", icon: Scale },
  { href: "/customer/inquiries", label: "My Inquiries", icon: MessageSquare },
  { href: "/customer/appointments", label: "My Appointments", icon: CalendarClock },
  { href: "/customer/saved-searches", label: "Saved Searches", icon: BookmarkCheck },
  { href: "/customer/profile", label: "Profile", icon: UserCircle },
];

export function CustomerSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Logo light />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
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
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-3">
        <form action={customerLogoutAction}>
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
