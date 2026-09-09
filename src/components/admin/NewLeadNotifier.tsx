"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getNewLeadsCountAction } from "@/lib/actions/leads.actions";
import { useToast } from "./ToastProvider";

const POLL_INTERVAL_MS = 30_000;

/** Reliable "new lead arrived" signal without a realtime subscription:
 *  polls the new-leads count every 30s and, if it goes up since the last
 *  check, toasts the admin and refreshes server data (sidebar badge,
 *  dashboard stats) via router.refresh(). */
export function NewLeadNotifier({ initialCount }: { initialCount: number }) {
  const router = useRouter();
  const toast = useToast();
  const lastCount = useRef(initialCount);

  useEffect(() => {
    lastCount.current = initialCount;
  }, [initialCount]);

  useEffect(() => {
    const id = setInterval(async () => {
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
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
