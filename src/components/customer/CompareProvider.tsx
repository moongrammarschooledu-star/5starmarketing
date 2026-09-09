"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCompareIds, addToCompare, removeFromCompare, clearCompare, MAX_COMPARE } from "@/lib/compareStore";

interface CompareContextValue {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => "added" | "removed" | "full";
  clear: () => void;
  isFull: boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(getCompareIds());
    function onChange(e: Event) {
      setIds((e as CustomEvent<string[]>).detail ?? getCompareIds());
    }
    window.addEventListener("compare-changed", onChange);
    return () => window.removeEventListener("compare-changed", onChange);
  }, []);

  function toggle(id: string): "added" | "removed" | "full" {
    if (ids.includes(id)) {
      setIds(removeFromCompare(id));
      return "removed";
    }
    const next = addToCompare(id);
    if (next === null) return "full";
    setIds(next);
    return "added";
  }

  function clear() {
    clearCompare();
    setIds([]);
  }

  return (
    <CompareContext.Provider value={{ ids, has: (id) => ids.includes(id), toggle, clear, isFull: ids.length >= MAX_COMPARE }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
