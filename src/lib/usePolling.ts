"use client";

import { useEffect, useRef } from "react";

/** Calls `callback` every `intervalMs`, but only while the tab is visible -
 *  a background tab costs the server nothing. When the tab comes back to the
 *  front it checks straight away if the last check is older than the
 *  interval, so a notification is never stale for long. */
export function usePolling(callback: () => void | Promise<void>, intervalMs: number) {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  }, [callback]);

  useEffect(() => {
    let lastRun = Date.now();
    const run = () => {
      lastRun = Date.now();
      void latest.current();
    };
    const timer = setInterval(() => {
      if (!document.hidden) run();
    }, intervalMs);
    const onVisible = () => {
      if (!document.hidden && Date.now() - lastRun >= intervalMs) run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
}
