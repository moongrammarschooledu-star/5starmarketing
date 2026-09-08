import clsx from "clsx";

export function SectionHeading({
  eyebrow,
  title,
  highlight,
  description,
  align = "left",
  light = false,
}: {
  eyebrow?: string;
  title: string;
  highlight?: string;
  description?: string;
  align?: "left" | "center";
  light?: boolean;
}) {
  return (
    <div
      className={clsx(
        "max-w-2xl",
        align === "center" && "mx-auto text-center"
      )}
    >
      {eyebrow && (
        <div
          className={clsx(
            "mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]",
            light ? "text-white/70" : "text-primary",
            align === "center" && "justify-center"
          )}
        >
          <span className="h-px w-8 bg-current" />
          {eyebrow}
        </div>
      )}
      <h2
        className={clsx(
          "text-3xl font-extrabold tracking-tight sm:text-4xl",
          light ? "text-white" : "text-ink"
        )}
      >
        {title}{" "}
        {highlight && <span className="text-primary">{highlight}</span>}
      </h2>
      {description && (
        <p
          className={clsx(
            "mt-4 text-base leading-relaxed",
            light ? "text-white/75" : "text-muted"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
