"use client";

import { Heart } from "lucide-react";
import clsx from "clsx";
import { useFavorites } from "./FavoritesProvider";

export function FavoriteButton({ propertyId, className }: { propertyId: string; className?: string }) {
  const { has, toggle } = useFavorites();
  const active = has(propertyId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(propertyId);
      }}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={active}
      className={clsx(
        "flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur transition-transform hover:scale-110",
        className
      )}
    >
      <Heart className={clsx("h-4.5 w-4.5", active ? "fill-primary text-primary" : "text-ink/60")} />
    </button>
  );
}
