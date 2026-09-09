"use client";

import { Scale } from "lucide-react";
import clsx from "clsx";
import { useCompare } from "./CompareProvider";
import { MAX_COMPARE } from "@/lib/compareStore";

export function CompareCheckbox({
  propertyId,
  iconOnly,
  className,
}: {
  propertyId: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const { has, toggle, isFull } = useCompare();
  const active = has(propertyId);
  const disabled = !active && isFull;

  return (
    <label
      className={clsx(
        "flex items-center justify-center gap-1.5 rounded-full border-2 text-xs font-bold transition-colors",
        iconOnly ? "h-9 w-9 shrink-0" : "px-3 py-2.5",
        active ? "border-primary bg-primary/10 text-primary" : "border-ink/15 text-ink hover:border-primary hover:text-primary",
        disabled && "cursor-not-allowed opacity-50 hover:border-ink/15 hover:text-ink",
        className
      )}
      title={disabled ? `You can compare up to ${MAX_COMPARE} properties.` : active ? "Remove from comparison" : "Add to comparison"}
    >
      <input
        type="checkbox"
        checked={active}
        disabled={disabled}
        onChange={() => toggle(propertyId)}
        className="sr-only"
      />
      <Scale className="h-3.5 w-3.5" /> {!iconOnly && "Compare"}
    </label>
  );
}
