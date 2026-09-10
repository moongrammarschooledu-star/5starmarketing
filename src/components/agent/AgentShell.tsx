"use client";

import { useState, type ReactNode } from "react";
import { X, Menu, LayoutDashboard, Users, LogOut, ExternalLink, UserCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Logo } from "@/components/Logo";
import { ToastProvider } from "@/components/admin/ToastProvider";
import { StaffNotificationBell } from "@/components/admin/StaffNotificationBell";
import { logoutAction } from "@/lib/actions/auth.actions";

const NAV = [
  { href: "/agent/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agent/leads", label: "My Leads", icon: Users },
];

export function AgentShell({ agentId, agentName, children }: { agentId: string; agentName: string; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface-muted lg:flex">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="fixed h-screen w-64">
            <Sidebar pathname={pathname} />
          </div>
        </aside>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-ink/60" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
            <div className="relative h-full w-72 max-w-[85%]">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute -right-11 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <Sidebar pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-ink lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden text-sm font-semibold text-muted lg:block">5STAR.M Agent Portal</div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink transition-colors hover:border-primary hover:text-primary sm:px-4"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">View Website</span>
              </Link>
              {agentId && <StaffNotificationBell userId={agentId} portal="agent" />}
              <div className="flex items-center gap-2 rounded-full bg-surface-muted px-3 py-2 text-xs font-bold text-ink">
                <UserCircle className="h-4.5 w-4.5 text-primary" />
                <span className="hidden sm:inline">{agentName}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}

function Sidebar({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Logo light />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV.map((item) => {
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
