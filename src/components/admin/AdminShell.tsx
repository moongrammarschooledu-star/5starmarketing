"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { ToastProvider } from "./ToastProvider";
import { NewLeadNotifier } from "./NewLeadNotifier";
import type { AdminRole } from "@/lib/models/user";

export function AdminShell({
  adminName,
  role,
  newLeadsCount = 0,
  children,
}: {
  adminName: string;
  role: AdminRole;
  newLeadsCount?: number;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <ToastProvider>
      <NewLeadNotifier initialCount={newLeadsCount} />
      <div className="min-h-screen bg-surface-muted lg:flex">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="fixed h-screen w-64">
            <AdminSidebar newLeadsCount={newLeadsCount} role={role} />
          </div>
        </aside>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-ink/60"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="relative h-full w-72 max-w-[85%]">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute -right-11 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <AdminSidebar onNavigate={() => setDrawerOpen(false)} newLeadsCount={newLeadsCount} role={role} />
            </div>
          </div>
        )}

        <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
          <AdminTopbar adminName={adminName} onMenuClick={() => setDrawerOpen(true)} />
          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
