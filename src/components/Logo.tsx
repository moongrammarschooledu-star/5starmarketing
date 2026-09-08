import Image from "next/image";
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
      {/* two-house roofline: smaller house (with chimney) behind a larger one */}
      <polygon points="2,46 24,16 46,46" fill="var(--primary)" opacity="0.88" />
      <rect x="7" y="24" width="6" height="14" fill="var(--primary)" opacity="0.88" />
      <rect x="16" y="34" width="8" height="10" rx="1" fill="var(--gray-accent)" />
      <polygon points="30,46 64,4 98,46" fill="var(--primary)" />
      <rect x="80" y="32" width="9" height="12" rx="1" fill="var(--gray-accent)" />
      {/* hammer laid diagonally across the join, white so it reads against the red roof */}
      <line x1="32" y1="36" x2="60" y2="22" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
      <g transform="translate(60,22) rotate(65)">
        <rect x="-7" y="-3.5" width="14" height="7" rx="2" fill="#ffffff" />
      </g>
      <rect x="2" y="48" width="96" height="4" rx="2" fill="var(--ink)" />
    </svg>
  );
}

// The real logo file (public/images/logo.png) is a flat RGB export with a
// near-white background baked in — it only looks right on light surfaces.
// On dark surfaces (the footer) we fall back to the coded, transparent
// white version above instead of showing a white box.
export function Logo({
  className,
  iconClassName,
  light = false,
}: {
  className?: string;
  iconClassName?: string;
  light?: boolean;
}) {
  if (!light) {
    return (
      <Image
        src="/images/logo.png"
        alt="5STAR.M Estate & Builders"
        width={1774}
        height={887}
        priority
        className={clsx("h-12 w-auto sm:h-14", className)}
      />
    );
  }

  return (
    <div className={clsx("flex items-center gap-2.5", className)}>
      <LogoIcon className={clsx("h-10 w-auto shrink-0", iconClassName)} />
      <div className="leading-none">
        <div className="font-heading text-xl font-extrabold tracking-tight text-white">
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
