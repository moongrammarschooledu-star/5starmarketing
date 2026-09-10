"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { PropertyMap } from "./PropertyMap";

// Leaflet touches `window` at import time, so this can never be
// server-rendered. next/dynamic's ssr:false option can't be called
// inside a Server Component, which is why this tiny "use client"
// wrapper exists — the /properties page (a Server Component) renders
// this instead of PropertyMap directly.
const LazyPropertyMap = dynamic(() => import("./PropertyMap").then((m) => m.PropertyMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface-muted">
      <div className="flex flex-col items-center gap-2 text-sm text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading map...
      </div>
    </div>
  ),
});

export function PropertyMapLoader(props: ComponentProps<typeof PropertyMap>) {
  return <LazyPropertyMap {...props} />;
}
