import type { Ref } from "react";
import { computeElevation, VIEW_LABELS, type ElevKind } from "@/lib/house/elevation";
import { feet } from "./PlanSvg";
import type { DesignData, ViewName } from "@/lib/house/types";

const FILL: Record<ElevKind, string> = {
  wall: "#efe7da",
  glass: "#bfe3f7",
  door: "#8a5a2b",
  slab: "#cdcdcd",
  parapet: "#e0d6c3",
  pillar: "#d8d0c0",
  plinth: "#a8a294",
  railing: "#f4f1ea",
  boundary: "#e7e2d8",
  gate: "#4a4a52",
  plants: "#7bbd5f",
  tree: "#5aa247",
};

/** The elevation drawing of one side of the house. Heights run up the page. */
export function ElevationSvg({ design, view, svgRef, className }: { design: DesignData; view: ViewName; svgRef?: Ref<SVGSVGElement>; className?: string }) {
  const e = computeElevation(design, view);
  const top = e.height;
  const x0 = -3;
  const x1 = e.span + 12;
  // z maps to -z so that heights go up the page.
  const y0 = -(top + 5);
  const y1 = 7;

  return (
    <svg
      ref={svgRef}
      viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ background: "#ffffff" }}
      fontFamily="system-ui, sans-serif"
    >
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="#ffffff" />
      <text x={e.span / 2} y={y0 + 2} textAnchor="middle" fontSize={1.6} fontWeight={700} fill="#222">
        {VIEW_LABELS[view]}
      </text>

      <rect x={x0} y={0} width={x1 - x0} height={3} fill="#e9efe0" />

      {e.shapes.map((s, i) => {
        const w = s.u1 - s.u0;
        const h = s.z1 - s.z0;
        const cx = (s.u0 + s.u1) / 2;
        const cy = -(s.z0 + s.z1) / 2;
        if (s.kind === "tree") {
          return (
            <g key={i}>
              <rect x={cx - 0.25} y={-s.z1 * 0.45} width={0.5} height={s.z1 * 0.45} fill="#6b4a32" />
              <ellipse cx={cx} cy={-s.z1 * 0.68} rx={Math.max(2.2, w * 0.75)} ry={s.z1 * 0.32} fill={FILL.tree} stroke="#3f7f32" strokeWidth={0.1} />
            </g>
          );
        }
        return (
          <g key={i}>
            <rect
              x={s.u0}
              y={-s.z1}
              width={w}
              height={h}
              fill={FILL[s.kind]}
              stroke={s.kind === "glass" ? "#1d6fa5" : s.kind === "door" ? "#5a3a1b" : "#333"}
              strokeWidth={s.kind === "wall" ? 0.06 : 0.1}
            />
            {s.kind === "glass" && (
              <g stroke="#1d6fa5" strokeWidth={0.07}>
                <line x1={cx} x2={cx} y1={-s.z1} y2={-s.z0} />
                {h > 2 && <line x1={s.u0} x2={s.u1} y1={cy} y2={cy} />}
              </g>
            )}
            {s.kind === "door" && (
              <g stroke="#5a3a1b" strokeWidth={0.07} fill="none">
                {w > 5 && <line x1={cx} x2={cx} y1={-s.z1} y2={-s.z0} />}
                <rect x={s.u0 + w * 0.12} y={-s.z1 + h * 0.08} width={w > 5 ? w / 2 - w * 0.17 : w * 0.76} height={h * 0.34} />
                <rect x={s.u0 + w * 0.12} y={-s.z1 + h * 0.52} width={w > 5 ? w / 2 - w * 0.17 : w * 0.76} height={h * 0.4} />
              </g>
            )}
          </g>
        );
      })}

      <line x1={x0} x2={x1} y1={0} y2={0} stroke="#222" strokeWidth={0.22} />

      <g stroke="#555" strokeWidth={0.07} fontSize={0.95} fill="#333">
        <line x1={e.span + 3} x2={e.span + 3} y1={0} y2={-top} />
        {[...e.levels.map((l) => l.z0), top].map((z, i) => (
          <g key={i}>
            <line x1={e.span + 2.4} x2={e.span + 3.6} y1={-z} y2={-z} />
            <text x={e.span + 4} y={-z + 0.3} stroke="none">
              {feet(z)}
            </text>
          </g>
        ))}
        <line x1={0} x2={e.span} y1={4.2} y2={4.2} />
        <line x1={0} x2={0} y1={3.6} y2={4.8} />
        <line x1={e.span} x2={e.span} y1={3.6} y2={4.8} />
        <text x={e.span / 2} y={6.1} textAnchor="middle" stroke="none">
          {feet(e.span)}
        </text>
      </g>
    </svg>
  );
}
