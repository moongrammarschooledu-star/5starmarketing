"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toggleFavoriteAction } from "@/lib/actions/customer.actions";

interface FavoritesContextValue {
  isLoggedIn: boolean;
  has: (propertyId: string) => boolean;
  toggle: (propertyId: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/** True when the browser holds a Supabase sign-in cookie. Visitors without one
 *  (almost everybody) never make the session call at all. */
function hasSignInCookie(): boolean {
  try {
    return document.cookie.split(";").some((c) => /^\s*sb-[^=]*-auth-token/.test(c));
  } catch {
    return false;
  }
}

/** Knows whether the visitor is a signed-in customer and which properties they
 *  saved. The public pages are identical for everybody (so the CDN can cache
 *  them); this is filled in by the browser after the page has loaded. */
export function FavoritesProvider({
  children,
  initialFavoriteIds = [],
  isLoggedIn: knownLoggedIn = false,
}: {
  children: ReactNode;
  /** Only for pages that already know the visitor (the customer panel). */
  initialFavoriteIds?: string[];
  isLoggedIn?: boolean;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(knownLoggedIn);
  const [ids, setIds] = useState<Set<string>>(new Set(initialFavoriteIds));
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (knownLoggedIn || !hasSignInCookie()) return;
    let cancelled = false;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { loggedIn?: boolean; favoriteIds?: string[] } | null) => {
        if (cancelled || !data?.loggedIn) return;
        setIsLoggedIn(true);
        setIds(new Set(data.favoriteIds ?? []));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [knownLoggedIn]);

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
