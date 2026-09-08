import clsx from "clsx";

/**
 * Vector recreation of the 5STAR.M mark (rooflines + hammer) used across
 * letterhead, business card and social posts. Kept as SVG so it stays crisp
 * at every size and is easy to recolor for dark backgrounds (footer, hero).
 */
export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 72"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <polygon points="6,46 34,10 62,46" fill="var(--primary)" />
      <polygon points="30,46 60,6 90,46" fill="var(--primary)" opacity="0.92" />
      <rect x="14" y="34" width="10" height="10" rx="1.5" fill="var(--gray-accent)" />
      <rect x="68" y="30" width="10" height="10" rx="1.5" fill="var(--gray-accent)" />
      <g transform="translate(52,4) rotate(45)">
        <rect x="-3.5" y="0" width="7" height="34" rx="2.5" fill="var(--ink)" />
        <rect x="-10" y="-9" width="20" height="13" rx="3" fill="var(--ink)" />
      </g>
      <rect x="2" y="48" width="92" height="4" rx="2" fill="var(--ink)" />
    </svg>
  );
}

export function Logo({
  className,
  iconClassName,
  light = false,
}: {
  className?: string;
  iconClassName?: string;
  light?: boolean;
}) {
  return (
    <div className={clsx("flex items-center gap-2.5", className)}>
      <LogoIcon className={clsx("h-10 w-auto shrink-0", iconClassName)} />
      <div className="leading-none">
        <div
          className={clsx(
            "font-heading text-xl font-extrabold tracking-tight",
            light ? "text-white" : "text-ink"
          )}
        >
          5 STAR.M
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="h-[3px] w-3 rounded-full bg-gray-accent/70" />
          <span className="text-[10px] font-bold tracking-[0.18em] text-primary">
            ESTATE &amp; BUILDERS
          </span>
          <span className="h-[3px] w-3 rounded-full bg-gray-accent/70" />
        </div>
      </div>
    </div>
  );
}
