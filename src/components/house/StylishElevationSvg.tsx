import type { ReactNode, Ref } from "react";
import { PLINTH } from "@/lib/house/catalog";
import { computeElevation, type ElevShape } from "@/lib/house/elevation";
import type { DesignData, ViewName } from "@/lib/house/types";

// A "rendered" look of the elevation: the same walls, doors, windows and slabs
// as the drawing, dressed like a modern Pakistani house front - wood and grey
// cladding, window canopies with grills, balcony railings, a pediment over the
// entrance, a decorated roof edge, the boundary wall with its gate and
// planter, wall lights, trees and the road. Everything is drawn from the plan.

export type StyleThemeKey = "cream" | "white" | "brick";

interface Theme {
  label: string;
  body: string;
  bodyShade: string;
  wood: string;
  woodDark: string;
  grey: string;
  stone: string;
  metal: string;
  gold: string;
  plinth: string;
}

export const STYLE_THEMES: Record<StyleThemeKey, Theme> = {
  cream: { label: "Cream, wood and grey", body: "#f5eddc", bodyShade: "#e3d7bd", wood: "#8c4d28", woodDark: "#64351a", grey: "#4d4e52", stone: "#7a746b", metal: "#1b1b1d", gold: "#d9b25f", plinth: "#5d5a56" },
  white: { label: "White and grey", body: "#f4f4f2", bodyShade: "#d9d9d4", wood: "#b07a4a", woodDark: "#86582f", grey: "#5d646e", stone: "#8a8d92", metal: "#1f2124", gold: "#cfcfcf", plinth: "#6a6d72" },
  brick: { label: "Warm brick", body: "#efdcc6", bodyShade: "#d8c2a6", wood: "#7a4426", woodDark: "#562e17", grey: "#8b3f33", stone: "#6e5a4c", metal: "#241c18", gold: "#d9b25f", plinth: "#5a4a40" },
};

export interface StylishOptions {
  theme: StyleThemeKey;
  /** Evening: lights are on and the sky is at dusk. Otherwise a bright day. */
  evening: boolean;
  plants: boolean;
  /** The boundary wall, gate and planter in front (front view only). */
  boundary: boolean;
}

export const DEFAULT_STYLISH: StylishOptions = { theme: "cream", evening: true, plants: true, boundary: true };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

interface Accent {
  u0: number;
  u1: number;
  z0: number;
  z1: number;
  fill: string;
}

function intersect(a: { u0: number; u1: number; z0: number; z1: number }, b: { u0: number; u1: number; z0: number; z1: number }) {
  const u0 = Math.max(a.u0, b.u0);
  const u1 = Math.min(a.u1, b.u1);
  const z0 = Math.max(a.z0, b.z0);
  const z1 = Math.min(a.z1, b.z1);
  return u1 - u0 > 0.02 && z1 - z0 > 0.02 ? { u0, u1, z0, z1 } : null;
}

/** A rectangle given in plan units (u across, z up) as SVG attributes (y runs down). */
function box(u0: number, u1: number, z0: number, z1: number) {
  return { x: u0, y: -z1, width: u1 - u0, height: z1 - z0 };
}

function Palm({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const leaves = [-72, -48, -24, 0, 24, 48, 72];
  return (
    <g>
      {leaves.map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        const len = size * (0.78 + 0.22 * Math.cos(a));
        const tx = x + Math.sin(a) * len;
        const ty = y - Math.cos(a) * len * 0.95;
        const mx = x + Math.sin(a) * len * 0.45;
        const my = y - Math.cos(a) * len * 0.5;
        const nx = Math.cos(a) * size * 0.16;
        const ny = Math.sin(a) * size * 0.16;
        return <path key={i} d={`M ${x} ${y} Q ${mx - nx} ${my - ny} ${tx} ${ty} Q ${mx + nx} ${my + ny} ${x} ${y}`} fill={color} opacity={0.96} />;
      })}
    </g>
  );
}

function Tree({ x, base, h, plants }: { x: number; base: number; h: number; plants: boolean }) {
  const greens = ["#2f6b2d", "#3f8a38", "#5aa247"];
  const blobs = [
    [0, -0.78, 0.3, 0],
    [-0.22, -0.64, 0.24, 1],
    [0.24, -0.66, 0.25, 1],
    [-0.1, -0.92, 0.22, 2],
    [0.14, -0.88, 0.2, 2],
    [-0.28, -0.84, 0.17, 0],
    [0.3, -0.84, 0.17, 0],
    [0, -0.55, 0.22, 0],
  ] as const;
  return (
    <g>
      <path d={`M ${x - h * 0.03} ${base} L ${x - h * 0.012} ${base - h * 0.55} L ${x + h * 0.012} ${base - h * 0.55} L ${x + h * 0.03} ${base} Z`} fill="#4a3322" />
      {plants && blobs.map(([dx, dy, r, c], i) => <circle key={i} cx={x + dx * h} cy={base + dy * h} r={r * h} fill={greens[c]} />)}
    </g>
  );
}

export function StylishElevationSvg({
  design,
  view,
  options,
  svgRef,
  className,
  idPrefix = "se",
}: {
  design: DesignData;
  view: ViewName;
  options: StylishOptions;
  svgRef?: Ref<SVGSVGElement>;
  className?: string;
  idPrefix?: string;
}) {
  const th = STYLE_THEMES[options.theme];
  const e = computeElevation(design, view);
  const id = (n: string) => `${idPrefix}-${n}`;
  const ev = options.evening;
  const floorH = design.floorHeight;
  const top = e.height;

  const bodyShapes = e.shapes.filter((s) => s.kind !== "plinth" && s.kind !== "boundary" && s.kind !== "gate" && s.kind !== "plants" && s.kind !== "tree");
  const uMin = bodyShapes.length ? Math.min(...bodyShapes.map((s) => s.u0)) : 0;
  const uMax = bodyShapes.length ? Math.max(...bodyShapes.map((s) => s.u1)) : e.span;
  const W = uMax - uMin;
  const levels = e.levels.map((l) => l.z0);
  const mainDoor = e.shapes.find((s) => s.kind === "door" && s.detail === "main_door" && s.z0 < levels[0] + 0.5);
  const topSlabZ = Math.max(...e.shapes.filter((s) => s.kind === "slab").map((s) => s.z0), 0);

  const x0 = Math.min(0, uMin) - 13;
  const x1 = Math.max(e.span, uMax) + 13;
  const y0 = -(top + 9);
  const y1 = 16;

  // Large decorated areas laid over the plain walls (kept inside the wall shapes).
  const accents: Accent[] = [];
  if (W >= 12) {
    levels.forEach((z0, f) => {
      if (f === 0) return;
      const zt = z0 + floorH + 0.5;
      const woodW = clamp(W * 0.2, 3.2, 5.5);
      accents.push({ u0: uMin + 0.3, u1: uMin + 0.3 + woodW, z0: z0 - 0.3, z1: zt, fill: `url(#${id("wood")})` });
      accents.push({ u0: uMin + 0.3 + woodW, u1: uMin + 0.3 + woodW + clamp(W * 0.34, 5, 9), z0: z0 + 6.4, z1: zt, fill: th.grey });
      accents.push({ u0: uMax - 1.5, u1: uMax - 0.6, z0: z0 - 0.3, z1: zt, fill: th.grey });
    });
  }
  if (mainDoor) accents.push({ u0: mainDoor.u0 - 1.9, u1: mainDoor.u0 - 0.6, z0: PLINTH, z1: (levels[0] ?? 0) + floorH + 0.5, fill: `url(#${id("stone")})` });

  // Light sources for the evening picture.
  const lights: { u: number; z: number; r: number }[] = [];
  const addLight = (u: number, z: number, r: number) => {
    if (ev) lights.push({ u, z, r });
  };

  const widestParapet = e.shapes.filter((s) => s.kind === "parapet").sort((p, q) => q.u1 - q.u0 - (p.u1 - p.u0))[0];

  const drawShape = (s: ElevShape, i: number): ReactNode => {
    const w = s.u1 - s.u0;
    const h = s.z1 - s.z0;
    const cx = (s.u0 + s.u1) / 2;

    switch (s.kind) {
      case "plinth":
        return (
          <g key={i}>
            <rect {...box(s.u0, s.u1, s.z0, s.z1)} fill={th.plinth} />
            <rect {...box(s.u0, s.u1, s.z1 - 0.12, s.z1)} fill="#00000033" />
          </g>
        );

      case "wall": {
        const parts = accents.map((a, k) => {
          const r = intersect(s, a);
          return r ? <rect key={k} {...box(r.u0, r.u1, r.z0, r.z1)} fill={a.fill} /> : null;
        });
        return (
          <g key={i}>
            <rect {...box(s.u0, s.u1, s.z0, s.z1)} fill={`url(#${id("body")})`} />
            {parts}
          </g>
        );
      }

      case "slab": {
        const lamps: ReactNode[] = [];
        if (w > 3.5 && s.z0 < topSlabZ - 0.1) {
          for (let u = s.u0 + 1.4; u < s.u1 - 0.7; u += 5.5) {
            lamps.push(<ellipse key={u} cx={u} cy={-s.z0 + 0.04} rx={0.3} ry={0.1} fill={ev ? "#fff1c8" : "#d8d2c4"} />);
            addLight(u, s.z0 - 0.05, 1.3);
          }
        }
        return (
          <g key={i}>
            <rect {...box(s.u0, s.u1, s.z0 - 0.9, s.z0)} fill={`url(#${id("under")})`} />
            <rect {...box(s.u0, s.u1, s.z0, s.z1)} fill={th.body} stroke={th.bodyShade} strokeWidth={0.06} />
            <rect {...box(s.u0, s.u1, s.z1 - 0.1, s.z1)} fill="#ffffff66" />
            {lamps}
          </g>
        );
      }

      case "parapet": {
        const isMain = s === widestParapet && w >= 9;
        if (!isMain) {
          return (
            <g key={i}>
              <rect {...box(s.u0, s.u1, s.z0, s.z1)} fill={th.body} />
              <rect {...box(s.u0 - 0.15, s.u1 + 0.15, s.z1, s.z1 + 0.35)} fill={th.body} stroke={th.bodyShade} strokeWidth={0.06} />
            </g>
          );
        }
        const aEnd = s.u0 + w * 0.3;
        const bEnd = aEnd + w * 0.34;
        const bars: ReactNode[] = [];
        for (let u = aEnd + 0.5; u < s.u1 - 0.4; u += 0.55) bars.push(<rect key={u} {...box(u, u + 0.09, s.z0 + 0.15, s.z1 - 0.05)} fill={th.metal} />);
        const slits = [0, 1, 2].map((k) => <rect key={k} {...box(s.u0 + (aEnd - s.u0) * 0.4 + k * 0.95, s.u0 + (aEnd - s.u0) * 0.4 + k * 0.95 + 0.5, s.z0 + 0.5, s.z1 - 0.2)} fill={th.grey} />);
        return (
          <g key={i}>
            <rect {...box(s.u0, aEnd, s.z0, s.z1)} fill={th.body} />
            {slits}
            <rect {...box(aEnd, bEnd, s.z0, s.z1)} fill={th.grey} />
            <rect {...box(bEnd, s.u1, s.z0 + 0.1, s.z0 + 0.25)} fill={th.metal} />
            <rect {...box(bEnd, s.u1, s.z1 - 0.3, s.z1 - 0.05)} fill={th.metal} />
            {bars}
            {[s.u0 - 0.15, aEnd - 0.5, bEnd - 0.2, s.u1 - 0.9].map((pu, k) => (
              <g key={k}>
                <rect {...box(pu, pu + 1.05, s.z0, s.z1 + 0.9)} fill={th.body} stroke={th.bodyShade} strokeWidth={0.06} />
                <rect {...box(pu - 0.12, pu + 1.17, s.z1 + 0.9, s.z1 + 1.2)} fill={th.body} stroke={th.bodyShade} strokeWidth={0.06} />
              </g>
            ))}
            <rect {...box(s.u0 - 0.15, bEnd, s.z1 + 0.9, s.z1 + 1.2)} fill={th.body} />
            {options.plants && <Palm x={s.u1 - 1.8} y={-(s.z0 + 0.25)} size={2.6} color="#3d8a3a" />}
            {(() => {
              addLight(s.u0 + 0.35, s.z1 + 0.5, 1.4);
              addLight(s.u1 - 0.4, s.z1 + 0.5, 1.4);
              return null;
            })()}
          </g>
        );
      }

      case "glass": {
        const tall = h >= 2.2;
        const canopy = tall ? (
          <g>
            <rect {...box(s.u0 - 0.9, s.u1 + 0.9, s.z1 + 0.28, s.z1 + 0.8)} fill={th.body} stroke={th.bodyShade} strokeWidth={0.06} />
            <rect {...box(s.u0 - 0.9, s.u1 + 0.9, s.z1 + 0.28, s.z1 + 0.4)} fill="#00000022" />
            <ellipse cx={cx} cy={-(s.z1 + 0.28) + 0.03} rx={0.3} ry={0.09} fill={ev ? "#fff1c8" : "#d8d2c4"} />
            <rect {...box(s.u0 - 0.3, s.u1 + 0.3, s.z0 - 0.3, s.z0)} fill={th.body} stroke={th.bodyShade} strokeWidth={0.06} />
          </g>
        ) : null;
        if (tall) {
          addLight(cx, s.z1 + 0.2, 1.5);
          addLight(s.u0 - 0.95, s.z0 + h * 0.5, 1.6);
        }
        const panes = w >= 3.2 ? 2 : 1;
        const paneW = (w - 0.3 - (panes - 1) * 0.2) / panes;
        const grills: ReactNode[] = [];
        for (let p = 0; p < panes; p++) {
          const pu0 = s.u0 + 0.15 + p * (paneW + 0.2);
          for (let u = pu0 + 0.5; u < pu0 + paneW - 0.2; u += 0.55) grills.push(<rect key={`v${p}-${u}`} {...box(u, u + 0.06, s.z0 + 0.15, s.z1 - 0.15)} fill={th.metal} />);
          if (tall) for (const f of [0.34, 0.68]) grills.push(<rect key={`h${p}-${f}`} {...box(pu0, pu0 + paneW, s.z0 + h * f, s.z0 + h * f + 0.07)} fill={th.metal} />);
        }
        return (
          <g key={i}>
            {canopy}
            <rect {...box(s.u0, s.u1, s.z0, s.z1)} fill={th.metal} />
            {Array.from({ length: panes }, (_, p) => {
              const pu0 = s.u0 + 0.15 + p * (paneW + 0.2);
              return <rect key={p} {...box(pu0, pu0 + paneW, s.z0 + 0.15, s.z1 - 0.15)} fill={`url(#${id(ev ? "glow-glass" : "day-glass")})`} />;
            })}
            {grills}
            {!ev && <path d={`M ${s.u0 + 0.4} ${-(s.z0 + 0.2)} L ${s.u0 + 1.4} ${-(s.z1 - 0.2)} L ${s.u0 + 1.9} ${-(s.z1 - 0.2)} L ${s.u0 + 0.9} ${-(s.z0 + 0.2)} Z`} fill="#ffffff44" />}
          </g>
        );
      }

      case "door": {
        if (w >= 7) {
          // A wide opening is a garage gate: slatted metal, no pediment.
          const slats: ReactNode[] = [];
          for (let z = s.z0 + 0.5; z < s.z1 - 0.2; z += 0.55) slats.push(<rect key={z} {...box(s.u0 + 0.15, s.u1 - 0.15, z, z + 0.06)} fill="#00000055" />);
          addLight(cx, s.z1 + 0.5, 1.6);
          return (
            <g key={i}>
              <rect {...box(s.u0 - 0.6, s.u1 + 0.6, s.z1, s.z1 + 0.45)} fill={th.body} stroke={th.bodyShade} strokeWidth={0.06} />
              <rect {...box(s.u0, s.u1, s.z0, s.z1)} fill={th.metal} />
              <rect {...box(s.u0 + 0.15, s.u1 - 0.15, s.z0, s.z1 - 0.15)} fill={th.grey} />
              {slats}
              <rect {...box(cx - 0.04, cx + 0.04, s.z0, s.z1 - 0.15)} fill={th.metal} />
            </g>
          );
        }
        const main = s.detail === "main_door";
        const leaves = w > 3.6 ? 2 : 1;
        const lw = (w - 0.4) / leaves;
        const doors: ReactNode[] = [];
        for (let k = 0; k < leaves; k++) {
          const lu = s.u0 + 0.2 + k * lw;
          doors.push(
            <g key={k}>
              <rect {...box(lu, lu + lw, s.z0, s.z1 - 0.2)} fill={`url(#${id("door")})`} />
              <rect {...box(lu + 0.3, lu + lw - 0.3, s.z0 + h * 0.52, s.z1 - 0.55)} fill="none" stroke={th.woodDark} strokeWidth={0.1} />
              <rect {...box(lu + 0.3, lu + lw - 0.3, s.z0 + 0.5, s.z0 + h * 0.46)} fill="none" stroke={th.woodDark} strokeWidth={0.1} />
            </g>
          );
        }
        const pediment = main ? (
          <g>
            <path d={`M ${s.u0 - 1.6} ${-(s.z1 + 0.15)} L ${cx} ${-(s.z1 + 2.7)} L ${s.u1 + 1.6} ${-(s.z1 + 0.15)} Z`} fill={th.body} stroke={th.bodyShade} strokeWidth={0.08} />
            <path d={`M ${s.u0 - 0.9} ${-(s.z1 + 0.15)} L ${cx} ${-(s.z1 + 2.05)} L ${s.u1 + 0.9} ${-(s.z1 + 0.15)} Z`} fill={`url(#${id("wood")})`} />
            <rect {...box(s.u0 - 1.9, s.u1 + 1.9, s.z1 - 0.1, s.z1 + 0.2)} fill={th.body} stroke={th.bodyShade} strokeWidth={0.06} />
          </g>
        ) : (
          <rect {...box(s.u0 - 0.5, s.u1 + 0.5, s.z1, s.z1 + 0.45)} fill={th.body} stroke={th.bodyShade} strokeWidth={0.06} />
        );
        if (main) {
          addLight(cx, s.z1 + 0.6, 1.8);
          addLight(s.u1 + 0.9, s.z0 + h * 0.55, 1.5);
        }
        return (
          <g key={i}>
            {pediment}
            <rect {...box(s.u0, s.u1, s.z0, s.z1)} fill={th.woodDark} />
            {doors}
            <rect {...box(s.u0 + w / 2 - 0.12, s.u0 + w / 2 + 0.12, s.z0 + h * 0.4, s.z0 + h * 0.55)} fill="#d8d8d8" opacity={leaves === 1 ? 0 : 1} />
            <rect {...box(s.u1 - 0.55, s.u1 - 0.42, s.z0 + h * 0.4, s.z0 + h * 0.58)} fill="#d8d8d8" opacity={leaves === 1 ? 1 : 0} />
            {/* sconce */}
            <rect {...box(s.u1 + 0.75, s.u1 + 1.1, s.z0 + h * 0.5, s.z0 + h * 0.5 + 0.8)} fill={th.metal} />
          </g>
        );
      }

      case "plants": {
        const n = Math.max(1, Math.floor(w / 1.9));
        return (
          <g key={i}>
            <rect {...box(s.u0, s.u1, -0.5, 0.9)} fill={th.metal} />
            <rect {...box(s.u0, s.u1, 0.78, 0.9)} fill={th.stone} />
            {options.plants && Array.from({ length: n }, (_, k) => <Palm key={k} x={s.u0 + ((k + 0.5) / n) * w} y={-0.9} size={k % 2 ? 2.4 : 3.1} color={k % 2 ? "#3a8a37" : "#2f7a2f"} />)}
          </g>
        );
      }

      case "tree":
        return options.plants ? <Tree key={i} x={cx} base={0} h={Math.max(10, s.z1)} plants /> : null;

      case "pillar":
        return (
          <g key={i}>
            <rect {...box(s.u0, s.u1, s.z0, s.z1)} fill={th.body} stroke={th.bodyShade} strokeWidth={0.06} />
            <rect {...box(s.u0 - 0.12, s.u1 + 0.12, s.z0, s.z0 + 0.7)} fill={th.stone} />
            <rect {...box(s.u0 - 0.12, s.u1 + 0.12, s.z1 - 0.35, s.z1)} fill={th.bodyShade} />
          </g>
        );

      case "railing": {
        const bars: ReactNode[] = [];
        for (let u = s.u0 + 0.3; u < s.u1 - 0.2; u += 0.55) bars.push(<rect key={u} {...box(u, u + 0.1, s.z0, s.z1 - 0.1)} fill={th.metal} />);
        const motif = w > 5;
        return (
          <g key={i}>
            <rect {...box(s.u0, s.u1, s.z0 + 0.1, s.z0 + 0.3)} fill={th.metal} />
            <rect {...box(s.u0, s.u1, s.z1 - 0.28, s.z1)} fill={th.metal} />
            <rect {...box(s.u0, s.u0 + 0.3, s.z0, s.z1)} fill={th.metal} />
            <rect {...box(s.u1 - 0.3, s.u1, s.z0, s.z1)} fill={th.metal} />
            {bars}
            {motif && (
              <g>
                <rect {...box(cx - 0.9, cx + 0.9, s.z0 + 0.4, s.z1 - 0.4)} fill={th.metal} />
                <path d={`M ${cx} ${-(s.z0 + 0.55)} L ${cx} ${-(s.z1 - 0.55)}`} stroke={th.gold} strokeWidth={0.07} />
                {[0, 1, 2, 3].map((k) => (
                  <g key={k}>
                    <ellipse cx={cx - 0.3} cy={-(s.z0 + 0.8 + k * 0.4)} rx={0.28} ry={0.1} transform={`rotate(-35 ${cx - 0.3} ${-(s.z0 + 0.8 + k * 0.4)})`} fill={th.gold} />
                    <ellipse cx={cx + 0.3} cy={-(s.z0 + 0.8 + k * 0.4)} rx={0.28} ry={0.1} transform={`rotate(35 ${cx + 0.3} ${-(s.z0 + 0.8 + k * 0.4)})`} fill={th.gold} />
                  </g>
                ))}
              </g>
            )}
            {options.plants && [s.u0 + 0.9, s.u1 - 0.9].map((pu, k) => (
              <g key={k}>
                <path d={`M ${pu - 0.35} ${-(s.z0 + 0.7)} L ${pu + 0.35} ${-(s.z0 + 0.7)} L ${pu + 0.25} ${-s.z0} L ${pu - 0.25} ${-s.z0} Z`} fill="#d9d4cb" />
                <Palm x={pu} y={-(s.z0 + 0.7)} size={1.5} color="#3d8a3a" />
              </g>
            ))}
          </g>
        );
      }

      default:
        return null;
    }
  };

  // ---- boundary wall and gates. Designs that have a boundary use it (any side the viewer
  // stands on); older designs get an automatic front wall with a gate.
  const Hw = design.boundary?.height ?? 4.6;
  const hasData = Boolean(design.boundary);
  let bPieces: { a: number; b: number }[] = [];
  let bGates: { a: number; b: number; kind: "main" | "small" }[] = [];
  if (hasData) {
    if (options.boundary) {
      bPieces = e.shapes.filter((s) => s.kind === "boundary").map((s) => ({ a: s.u0, b: s.u1 }));
      bGates = e.shapes.filter((s) => s.kind === "gate").map((s) => ({ a: s.u0, b: s.u1, kind: s.gate ?? "main" }));
    }
  } else if (view === "front" && options.boundary) {
    const gw = e.span >= 22 ? 9 : e.span >= 16 ? 7 : 0;
    if (gw) {
      const gx = clamp(mainDoor ? (mainDoor.u0 + mainDoor.u1) / 2 : e.span * 0.65, gw / 2 + 1.6, e.span - gw / 2 - 1.6);
      bGates = [{ a: gx - gw / 2, b: gx + gw / 2, kind: "main" }];
      bPieces = [{ a: 0, b: gx - gw / 2 }, { a: gx + gw / 2, b: e.span }];
    } else {
      bPieces = [{ a: 0, b: e.span }];
    }
  }
  const showBoundary = bPieces.length > 0 || bGates.length > 0;
  const boundary: ReactNode = (() => {
    if (!showBoundary) return null;
    const sorted = bPieces.filter((p) => p.b - p.a > 0.3);
    // The longest piece of wall gets the stripes, the planter and the wall lights (front view).
    const decorated = view === "front" ? sorted.slice().sort((p, q) => q.b - q.a - (p.b - p.a))[0] : undefined;

    const wallPieces = sorted.map((s, k) => {
      const len = s.b - s.a;
      const outer: "left" | "right" | "mid" = s.a <= 0.01 ? "left" : s.b >= e.span - 0.01 ? "right" : "mid";
      const dir = outer === "right" ? -1 : 1;
      const origin = outer === "right" ? s.b : s.a;
      const span = (t0: number, t1: number) => {
        const p0 = origin + dir * t0;
        const p1 = origin + dir * t1;
        return [Math.min(p0, p1), Math.max(p0, p1)] as const;
      };
      const dec = s === decorated && len > 5;
      const stripes: ReactNode[] = [];
      if (dec && len > 6) {
        const [a0, a1] = span(1.7, 2.5);
        const [b0, b1] = span(3.0, 3.5);
        stripes.push(<rect key="a" {...box(a0, a1, 0, Hw)} fill={th.grey} />, <rect key="b" {...box(b0, b1, 0, Hw)} fill={th.bodyShade} />);
        if (len > 9) {
          const [c0, c1] = span(5.2, 6.0);
          stripes.push(<rect key="c" {...box(c0, c1, 0, Hw)} fill={th.grey} />);
        }
        addLight(origin + dir * 2.1, 2.8, 1.1);
        if (len > 9) addLight(origin + dir * 5.6, 2.8, 1.1);
      }
      const palms = dec ? Math.max(2, Math.floor((len - 2.2) / 2)) : 0;
      const [p0, p1] = span(0.8, len - 1.6);
      const [e0, e1] = span(0, 1.1);
      return (
        <g key={k}>
          <rect {...box(s.a, s.b, 0, Hw)} fill={th.body} />
          {stripes}
          <rect {...box(s.a, s.b, Hw, Hw + 0.25)} fill={th.bodyShade} />
          {outer !== "mid" && (
            <g>
              <rect {...box(e0, e1, 0, Hw + 1.2)} fill={th.body} stroke={th.bodyShade} strokeWidth={0.06} />
              <rect {...box(e0 - 0.1, e1 + 0.1, Hw + 1.2, Hw + 1.45)} fill={th.bodyShade} />
            </g>
          )}
          {dec && (
            <g>
              <rect {...box(p0, p1, -0.6, 0.9)} fill={th.metal} />
              <rect {...box(p0, p1, 0.78, 0.9)} fill={th.stone} />
              {Array.from({ length: palms }, (_, j) => {
                const px = origin + dir * (1.8 + j * 2.1);
                if (ev) addLight(px, 0.1, 0.9);
                return (
                  <g key={j}>
                    {options.plants && <Palm x={px} y={-0.9} size={j % 2 ? 2.4 : 3.1} color={j % 2 ? "#3a8a37" : "#2f7a2f"} />}
                    {ev && <circle cx={px} cy={-0.1} r={0.14} fill="#ffe7a8" />}
                  </g>
                );
              })}
            </g>
          )}
        </g>
      );
    });

    const gates = bGates.map((gt, gi) => {
      const gwid = gt.b - gt.a;
      const gcx = (gt.a + gt.b) / 2;
      const main = gt.kind === "main";
      const leaves = main && gwid >= 5 ? 2 : 1;
      return (
        <g key={`gate${gi}`}>
          {[gt.a - 0.9, gt.b].map((pu, k) => (
            <g key={k}>
              <rect {...box(pu, pu + 0.9, 0, Hw + 0.8)} fill={th.grey} />
              <rect {...box(pu - 0.1, pu + 1.0, Hw + 0.8, Hw + 1.05)} fill={th.stone} />
              <rect {...box(pu + 0.15, pu + 0.75, Hw + 1.05, Hw + 1.55)} fill={ev ? "#fff1c8" : "#e4dfd2"} />
              <rect {...box(pu + 0.05, pu + 0.85, Hw + 1.55, Hw + 1.7)} fill={th.stone} />
            </g>
          ))}
          {Array.from({ length: leaves }, (_, k) => {
            const g0 = gt.a + k * (gwid / leaves);
            const g1 = g0 + gwid / leaves;
            const bars: ReactNode[] = [];
            for (let u = g0 + 0.3; u < g1 - 0.2; u += 0.5) bars.push(<rect key={u} {...box(u, u + 0.08, 3.5, Hw - 0.15)} fill={th.metal} />);
            const slats: ReactNode[] = [];
            for (let z = 0.5; z < 3.4; z += 0.55) slats.push(<rect key={z} {...box(g0 + 0.2, g1 - 0.2, z, z + 0.4)} fill={`url(#${id("wood")})`} />);
            return (
              <g key={k}>
                <rect {...box(g0, g1, 0.15, Hw)} fill={th.metal} />
                {slats}
                {bars}
                <rect {...box(g0, g1, 3.4, 3.6)} fill={th.metal} />
                <rect {...box(g0 + 0.1, g1 - 0.1, Hw - 0.3, Hw - 0.1)} fill={th.metal} />
              </g>
            );
          })}
          {main && (
            <g>
              <path d={`M ${gcx} ${-0.9} L ${gcx} ${-3.2}`} stroke={th.gold} strokeWidth={0.09} />
              {[0, 1, 2, 3, 4].map((k) => (
                <g key={k}>
                  <ellipse cx={gcx - 0.38} cy={-(1.2 + k * 0.45)} rx={0.34} ry={0.12} transform={`rotate(-35 ${gcx - 0.38} ${-(1.2 + k * 0.45)})`} fill={th.gold} />
                  <ellipse cx={gcx + 0.38} cy={-(1.2 + k * 0.45)} rx={0.34} ry={0.12} transform={`rotate(35 ${gcx + 0.38} ${-(1.2 + k * 0.45)})`} fill={th.gold} />
                </g>
              ))}
            </g>
          )}
          <rect {...box(gt.a, gt.b, -0.3, 0)} fill="#d4d0c8" />
          {main && <rect {...box(gt.a + 0.4, gt.b - 0.4, -0.65, -0.3)} fill="#c3beb5" />}
          {(() => {
            addLight(gt.a - 0.45, Hw + 1.3, 1.1);
            addLight(gt.b + 0.45, Hw + 1.3, 1.1);
            return null;
          })()}
        </g>
      );
    });

    return (
      <g>
        {wallPieces}
        {gates}
      </g>
    );
  })();
  const sky = ev ? ["#2f5c9a", "#6c93c4", "#f2b57e"] : ["#3c86cc", "#8fc0ea", "#e4f0f8"];

  return (
    <svg ref={svgRef} viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`} xmlns="http://www.w3.org/2000/svg" className={className} style={{ background: "#ffffff" }} fontFamily="system-ui, sans-serif">
      <defs>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="0.65" stopColor={sky[1]} />
          <stop offset="1" stopColor={sky[2]} />
        </linearGradient>
        <linearGradient id={id("body")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={th.body} />
          <stop offset="1" stopColor={th.bodyShade} />
        </linearGradient>
        <linearGradient id={id("under")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={id("door")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={th.wood} />
          <stop offset="1" stopColor={th.woodDark} />
        </linearGradient>
        <linearGradient id={id("glow-glass")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd98a" />
          <stop offset="1" stopColor="#e98a38" />
        </linearGradient>
        <linearGradient id={id("day-glass")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d3e8f7" />
          <stop offset="1" stopColor="#6ea3cf" />
        </linearGradient>
        <radialGradient id={id("glow")}>
          <stop offset="0" stopColor="#ffd88a" stopOpacity="0.7" />
          <stop offset="0.3" stopColor="#ffbd5c" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffa530" stopOpacity="0" />
        </radialGradient>
        <pattern id={id("wood")} width="4" height="0.5" patternUnits="userSpaceOnUse">
          <rect width="4" height="0.5" fill={th.wood} />
          <rect width="4" height="0.07" y="0.43" fill={th.woodDark} />
          <rect width="1.3" height="0.04" x="0.4" y="0.2" fill={th.woodDark} opacity="0.5" />
          <rect width="1.1" height="0.04" x="2.3" y="0.28" fill={th.woodDark} opacity="0.5" />
        </pattern>
        <pattern id={id("stone")} width="1.4" height="0.7" patternUnits="userSpaceOnUse">
          <rect width="1.4" height="0.7" fill={th.stone} />
          <rect width="1.4" height="0.05" fill="#00000040" />
          <rect width="0.05" height="0.35" fill="#00000040" />
          <rect width="0.05" height="0.35" x="0.7" y="0.35" fill="#00000040" />
        </pattern>
      </defs>

      {/* sky and clouds */}
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={`url(#${id("sky")})`} />
      {[[-6, -top * 0.82, 4.5], [e.span * 0.7, -top * 0.95, 5.5], [e.span + 8, -top * 0.6, 4]].map(([cx, cy, r], i) => (
        <g key={i} opacity={ev ? 0.35 : 0.85} fill="#fff">
          <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.28} />
          <ellipse cx={cx + r * 0.5} cy={cy - r * 0.12} rx={r * 0.6} ry={r * 0.26} />
        </g>
      ))}

      {/* neighbours' walls and trees */}
      <rect {...box(x0, Math.min(0, uMin) - 2.2, 0, 6.5)} fill="#9aa0a6" />
      <rect {...box(Math.max(e.span, uMax) + 2.2, x1, 0, 6.5)} fill="#9aa0a6" />
      <Tree x={x0 + 3.5} base={0} h={top * 0.66} plants={options.plants} />
      <Tree x={x1 - 3.5} base={0} h={top * 0.62} plants={options.plants} />
      <Tree x={x0 + 9} base={0} h={top * 0.44} plants={options.plants} />
      <Tree x={x1 - 9} base={0} h={top * 0.42} plants={options.plants} />

      {/* ground, pavement, kerb and road */}
      <rect x={x0} y={0} width={x1 - x0} height={4.5} fill="#6f9a3f" />
      <rect x={0} y={0} width={e.span} height={4.5} fill="#d3cec4" />
      <rect x={x0} y={4.5} width={x1 - x0} height={0.6} fill="#c9c6bf" />
      <rect x={x0} y={5.1} width={x1 - x0} height={y1 - 5.1} fill="#4e5157" />
      {Array.from({ length: Math.ceil((x1 - x0) / 7) }, (_, k) => (
        <rect key={k} x={x0 + 1 + k * 7} y={10.4} width={3.5} height={0.25} fill="#e8e6df" opacity={0.85} />
      ))}

      {/* the house */}
      {e.shapes.map(drawShape)}

      {boundary}

      {/* evening lights */}
      {ev && lights.map((l, i) => <circle key={i} cx={l.u} cy={-l.z} r={l.r * 0.85} fill={`url(#${id("glow")})`} />)}
    </svg>
  );
}
