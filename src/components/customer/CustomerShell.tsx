"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu, X, ExternalLink, UserCircle } from "lucide-react";
import { CustomerSidebar } from "./CustomerSidebar";
import { ToastProvider } from "@/components/admin/ToastProvider";

export function CustomerShell({ customerName, children }: { customerName: string; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <ToastProvider>
    <div className="min-h-screen bg-surface-muted lg:flex">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed h-screen w-64">
          <CustomerSidebar />
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
            <CustomerSidebar onNavigate={() => setDrawerOpen(false)} />
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
          <div className="hidden text-sm font-semibold text-muted lg:block">5STAR.M Customer Portal</div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink transition-colors hover:border-primary hover:text-primary sm:px-4"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Back to Website</span>
            </Link>
            <Link
              href="/customer/profile"
              className="flex items-center gap-2 rounded-full bg-surface-muted px-3 py-2 text-xs font-bold text-ink"
            >
              <UserCircle className="h-4.5 w-4.5 text-primary" />
              <span className="hidden sm:inline">{customerName}</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
    </ToastProvider>
  );
}
