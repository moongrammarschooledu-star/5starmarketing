import Image from "next/image";
import clsx from "clsx";

// The one real logo file (public/images/logo.png) is a flat RGB export
// with a near-white background baked in — on a dark surface (footer,
// admin/agent/customer sidebars) that shows as an ugly white rectangle,
// so `light` wraps it in a small white rounded card instead of
// swapping in a hand-drawn recreation. This keeps the actual brand
// logo pixel-identical everywhere it appears, on every background.
export function Logo({
  className,
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  const img = (
    <Image
      src="/images/logo.png"
      alt="5STAR.M Estate & Builders"
      width={1774}
      height={887}
      priority
      className={clsx("h-12 w-auto sm:h-14", !light && className)}
    />
  );

  if (!light) return img;

  return (
    <div className={clsx("inline-flex items-center rounded-xl bg-white px-3 py-2", className)}>
      <Image src="/images/logo.png" alt="5STAR.M Estate & Builders" width={1774} height={887} priority className="h-8 w-auto" />
    </div>
  );
}
