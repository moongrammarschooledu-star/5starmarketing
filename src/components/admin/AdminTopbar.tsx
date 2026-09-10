"use client";

import Link from "next/link";
import { Menu, ExternalLink, UserCircle } from "lucide-react";
import { StaffNotificationBell } from "./StaffNotificationBell";

export function AdminTopbar({
  adminId,
  adminName,
  onMenuClick,
}: {
  adminId: string;
  adminName: string;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-ink lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden text-sm font-semibold text-muted lg:block">
        5STAR.M Admin Dashboard
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink transition-colors hover:border-primary hover:text-primary sm:px-4"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">View Website</span>
        </Link>
        {adminId && <StaffNotificationBell userId={adminId} portal="admin" />}
        <Link
          href="/admin/profile"
          className="flex items-center gap-2 rounded-full bg-surface-muted px-3 py-2 text-xs font-bold text-ink"
        >
          <UserCircle className="h-4.5 w-4.5 text-primary" />
          <span className="hidden sm:inline">{adminName}</span>
        </Link>
      </div>
    </header>
  );
}
