"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import clsx from "clsx";
import {
  getUnreadNotificationCountAction,
  listNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/customer.actions";
import type { CustomerNotification } from "@/lib/models/customer";
import { resolveNotificationLink } from "@/lib/notificationLinks";

const POLL_INTERVAL_MS = 30_000;

/** The customer-portal counterpart to StaffNotificationBell.tsx —
 *  this genuinely didn't exist before STEP 31 (customer_notifications
 *  has been written to since STEP 11, but nothing in the customer
 *  portal ever displayed them). */
export function CustomerNotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getUnreadNotificationCountAction(userId).then(setUnread).catch(() => {});
    const id = setInterval(() => {
      getUnreadNotificationCountAction(userId).then(setUnread).catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [userId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      const list = await listNotificationsAction(userId);
      setItems(list);
      setLoaded(true);
    }
  }

  async function handleItemClick(n: CustomerNotification) {
    if (!n.read) {
      await markNotificationReadAction(n.id);
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
      setUnread((c) => Math.max(0, c - 1));
    }
    const href = resolveNotificationLink("customer", n.entityType, n.entityId);
    setOpen(false);
    if (href) router.push(href);
  }

  async function handleMarkAllRead() {
    await markAllNotificationsReadAction(userId);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnread(0);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-ink transition-colors hover:text-primary"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-80 max-w-[90vw] rounded-2xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-heading text-sm font-bold text-ink">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={handleMarkAllRead} className="text-xs font-bold text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!loaded && <p className="p-4 text-center text-xs text-muted">Loading…</p>}
            {loaded && items.length === 0 && (
              <p className="p-4 text-center text-xs text-muted">No notifications yet.</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleItemClick(n)}
                className={clsx(
                  "block w-full border-b border-border/60 px-4 py-3 text-left text-xs transition-colors last:border-0 hover:bg-surface-muted",
                  !n.read && "bg-primary/5"
                )}
              >
                <p className={clsx("font-bold text-ink", !n.read && "text-primary")}>{n.title}</p>
                <p className="mt-0.5 text-muted">{n.message}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
