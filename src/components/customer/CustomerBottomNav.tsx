"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Heart, LifeBuoy, UserCircle } from "lucide-react";
import clsx from "clsx";

const ITEMS = [
  { href: "/customer/dashboard", label: "Home", icon: Home },
  { href: "/properties", label: "Search", icon: Search },
  { href: "/customer/favorites", label: "Favorites", icon: Heart },
  { href: "/customer/support", label: "Support", icon: LifeBuoy },
  { href: "/customer/profile", label: "Profile", icon: UserCircle },
];

/** Mobile-only bottom tab bar (STEP 31, section 5) — hidden at lg and
 *  above, where the existing sidebar already covers navigation. */
export function CustomerBottomNav() {
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
