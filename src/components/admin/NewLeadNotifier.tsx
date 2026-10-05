"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getNewLeadsCountAction } from "@/lib/actions/leads.actions";
import { usePolling } from "@/lib/usePolling";
import { useToast } from "./ToastProvider";

// Every check is a server call, and an admin tab can stay open all day, so
// this is kept modest and paused while the tab is hidden (see usePolling).
const POLL_INTERVAL_MS = 120_000;

/** Reliable "new lead arrived" signal without a realtime subscription:
 *  polls the new-leads count every 2 minutes (only while the tab is visible)
 *  and, if it goes up since the last check, toasts the admin and refreshes
 *  server data (sidebar badge, dashboard stats) via router.refresh(). */
export function NewLeadNotifier({ initialCount }: { initialCount: number }) {
  const router = useRouter();
  const toast = useToast();
  const lastCount = useRef(initialCount);

  useEffect(() => {
    lastCount.current = initialCount;
  }, [initialCount]);

  usePolling(async () => {
    const count = await getNewLeadsCountAction();
    if (count > lastCount.current) {
      const arrived = count - lastCount.current;
      toast.show(
        arrived === 1
          ? "New property inquiry received."
          : `${arrived} new property inquiries received.`
      );
      router.refresh();
    }
    lastCount.current = count;
  }, POLL_INTERVAL_MS);

  return null;
}
