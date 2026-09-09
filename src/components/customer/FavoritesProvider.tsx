"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toggleFavoriteAction } from "@/lib/actions/customer.actions";

interface FavoritesContextValue {
  isLoggedIn: boolean;
  has: (propertyId: string) => boolean;
  toggle: (propertyId: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({
  initialFavoriteIds,
  isLoggedIn,
  children,
}: {
  initialFavoriteIds: string[];
  isLoggedIn: boolean;
  children: ReactNode;
}) {
  const [ids, setIds] = useState<Set<string>>(new Set(initialFavoriteIds));
  const router = useRouter();
  const pathname = usePathname();

  async function toggle(propertyId: string) {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}&notice=save`);
      return;
    }
    const wasFavorited = ids.has(propertyId);
    setIds((prev) => {
      const next = new Set(prev);
      if (wasFavorited) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });
    const result = await toggleFavoriteAction(propertyId);
    if (!result.ok) {
      // Roll back on failure.
      setIds((prev) => {
        const next = new Set(prev);
        if (wasFavorited) next.add(propertyId);
        else next.delete(propertyId);
        return next;
      });
    }
  }

  return (
    <FavoritesContext.Provider value={{ isLoggedIn, has: (id) => ids.has(id), toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
