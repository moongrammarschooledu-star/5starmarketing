import type { ReactNode, Ref } from "react";
import { ROOM_SPECS, WALL_INNER, WALL_OUTER } from "@/lib/house/catalog";
import { absOpenings, roomArea, wallSegments, type AbsOpening } from "@/lib/house/geometry";
import type { DesignData, Floor, Room } from "@/lib/house/types";

/** Plan margin around the plot (feet) for dimension lines and the road label. */
export const PLAN_MARGIN = 6;

export function feet(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return `${rounded}'`;
}

function arc(hingeAlong: number, toAlong: number, c: number, orient: "h" | "v", roomDir: number, r: number): string {
  // Hinge, leaf end (perpendicular into the room) and the jamb the leaf swings to.
  const hinge = orient === "h" ? { x: hingeAlong, y: c } : { x: c, y: hingeAlong };
  const leaf = orient === "h" ? { x: hingeAlong, y: c + roomDir * r } : { x: c + roomDir * r, y: hingeAlong };
  const dir = Math.sign(toAlong - hingeAlong) || 1;
  const jamb = orient === "h" ? { x: hingeAlong + dir * r, y: c } : { x: c, y: hingeAlong + dir * r };
  const cross = (leaf.x - hinge.x) * (jamb.y - hinge.y) - (leaf.y - hinge.y) * (jamb.x - hinge.x);
  const sweep = cross > 0 ? 1 : 0;
  return `M ${hinge.x} ${hinge.y} L ${leaf.x} ${leaf.y} M ${leaf.x} ${leaf.y} A ${r} ${r} 0 0 ${sweep} ${jamb.x} ${jamb.y}`;
}

function roomDirection(o: AbsOpening): number {
  return o.side === "top" || o.side === "left" ? 1 : -1;
}

function DoorSymbol({ o }: { o: AbsOpening }) {
  const w = o.b - o.a;
  const dir = roomDirection(o);
  const stroke = { fill: "none", stroke: "#444", strokeWidth: 0.09 } as const;
  if (o.kind === "main_door") {
    const half = w / 2;
    return (
      <g {...stroke}>
        <path d={arc(o.a, o.b, o.c, o.orient, dir, half)} />
        <path d={arc(o.b, o.a, o.c, o.orient, dir, half)} />
      </g>
    );
  }
  return <path d={arc(o.a, o.b, o.c, o.orient, dir, w)} {...stroke} />;
}

function OpeningSymbol({ o }: { o: AbsOpening }) {
  const gap = WALL_OUTER + 0.12;
  const horizontal = o.orient === "h";
  const rect = horizontal
    ? { x: o.a, y: o.c - gap / 2, width: o.b - o.a, height: gap }
    : { x: o.c - gap / 2, y: o.a, width: gap, height: o.b - o.a };
  const glass = o.kind === "window" || o.kind === "ventilator";
  const line = (offset: number, key: string) =>
    horizontal ? (
      <line key={key} x1={o.a} x2={o.b} y1={o.c + offset} y2={o.c + offset} stroke="#1d6fa5" strokeWidth={0.09} />
    ) : (
      <line key={key} x1={o.c + offset} x2={o.c + offset} y1={o.a} y2={o.b} stroke="#1d6fa5" strokeWidth={0.09} />
    );
  return (
    <g>
      <rect {...rect} fill="#ffffff" />
      {glass ? (o.kind === "window" ? [line(-0.28, "a"), line(0, "b"), line(0.28, "c")] : [line(0, "a")]) : <DoorSymbol o={o} />}
    </g>
  );
}

function StairSteps({ room }: { room: Room }) {
  const lines: ReactNode[] = [];
  const vertical = room.h >= room.w;
  const step = 0.85;
  const count = Math.floor((vertical ? room.h : room.w) / step);
  for (let i = 1; i < count; i++) {
    const d = i * step;
    lines.push(
      vertical ? (
        <line key={i} x1={room.x + 0.2} x2={room.x + room.w - 0.2} y1={room.y + d} y2={room.y + d} stroke="#888" strokeWidth={0.06} />
      ) : (
        <line key={i} x1={room.x + d} x2={room.x + d} y1={room.y + 0.2} y2={room.y + room.h - 0.2} stroke="#888" strokeWidth={0.06} />
      )
    );
  }
  return <g>{lines}</g>;
}

function RoomLabel({ room }: { room: Room }) {
  const spec = ROOM_SPECS[room.type];
  const name = room.name || spec.label;
  const maxByWidth = (room.w * 0.92) / Math.max(4, name.length * 0.56);
  const fs = Math.max(0.55, Math.min(1.3, maxByWidth, room.h / 4));
  const showSize = room.h >= fs * 3 && room.w >= 4;
  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;
  return (
    <g pointerEvents="none" fontFamily="system-ui, sans-serif" textAnchor="middle" fill="#1a1a1a">
      <text x={cx} y={showSize ? cy - fs * 0.15 : cy + fs * 0.35} fontSize={fs} fontWeight={700}>
        {name}
      </text>
      {showSize && (
        <text x={cx} y={cy + fs * 1.05} fontSize={fs * 0.82} fill="#555">
          {feet(room.w)} x {feet(room.h)}
        </text>
      )}
      {showSize && room.h >= fs * 4.2 && (
        <text x={cx} y={cy + fs * 2} fontSize={fs * 0.7} fill="#777">
          {roomArea(room)} sq ft
        </text>
      )}
    </g>
  );
}

function Dimension({ x1, y1, x2, y2, label }: { x1: number; y1: number; x2: number; y2: number; label: string }) {
  const vertical = x1 === x2;
  const tick = 0.5;
  return (
    <g stroke="#555" strokeWidth={0.07} fontFamily="system-ui, sans-serif" fontSize={1.05} fill="#333">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {vertical ? (
        <>
          <line x1={x1 - tick} x2={x1 + tick} y1={y1} y2={y1} />
          <line x1={x2 - tick} x2={x2 + tick} y1={y2} y2={y2} />
          <text x={x1 - 0.6} y={(y1 + y2) / 2} stroke="none" textAnchor="middle" transform={`rotate(-90 ${x1 - 0.6} ${(y1 + y2) / 2})`}>
            {label}
          </text>
        </>
      ) : (
        <>
          <line x1={x1} x2={x1} y1={y1 - tick} y2={y1 + tick} />
          <line x1={x2} x2={x2} y1={y2 - tick} y2={y2 + tick} />
          <text x={(x1 + x2) / 2} y={y1 - 0.6} stroke="none" textAnchor="middle">
            {label}
          </text>
        </>
      )}
    </g>
  );
}

export interface PlanSvgProps {
  design: DesignData;
  floor: Floor;
  selectedRoomId?: string | null;
  showGrid?: boolean;
  showDimensions?: boolean;
  svgRef?: Ref<SVGSVGElement>;
  /** Interactive layer drawn on top (hit areas, handles). */
  overlay?: ReactNode;
  className?: string;
  onPointerDown?: (e: React.PointerEvent<SVGSVGElement>) => void;
}

/** The floor plan drawing: rooms, walls with door and window symbols, room
 *  names and sizes, outer dimensions and the road side. Pure SVG, so the
 *  same component serves the editor, the print sheet and the PNG download. */
export function PlanSvg({ design, floor, selectedRoomId, showGrid, showDimensions = true, svgRef, overlay, className, onPointerDown }: PlanSvgProps) {
  const { width: W, length: L } = design.plot;
  const M = PLAN_MARGIN;
  const segments = wallSegments(floor.rooms);
  const openings = absOpenings(floor.rooms);

  return (
    <svg
      ref={svgRef}
      viewBox={`${-M} ${-M} ${W + 2 * M} ${L + 2 * M}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ touchAction: "none", userSelect: "none", background: "#ffffff" }}
      onPointerDown={onPointerDown}
    >
      <rect x={-M} y={-M} width={W + 2 * M} height={L + 2 * M} fill="#ffffff" />

      {showGrid && (
        <g data-export="skip" pointerEvents="none">
          {Array.from({ length: Math.floor(W) + 1 }, (_, i) => (
            <line key={`gx${i}`} x1={i} x2={i} y1={0} y2={L} stroke={i % 5 === 0 ? "#d4d4d8" : "#ececef"} strokeWidth={i % 5 === 0 ? 0.07 : 0.04} />
          ))}
          {Array.from({ length: Math.floor(L) + 1 }, (_, i) => (
            <line key={`gy${i}`} y1={i} y2={i} x1={0} x2={W} stroke={i % 5 === 0 ? "#d4d4d8" : "#ececef"} strokeWidth={i % 5 === 0 ? 0.07 : 0.04} />
          ))}
        </g>
      )}

      <rect x={0} y={0} width={W} height={L} fill="none" stroke="#9a9aa2" strokeWidth={0.12} strokeDasharray="0.8 0.5" />

      {floor.rooms.map((r) => (
        <rect
          key={r.id}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          fill={ROOM_SPECS[r.type].color}
          stroke={ROOM_SPECS[r.type].open ? "#8aa07a" : "none"}
          strokeWidth={0.1}
          strokeDasharray={ROOM_SPECS[r.type].open ? "0.5 0.35" : undefined}
        />
      ))}

      {floor.rooms.filter((r) => r.type === "stairs").map((r) => (
        <StairSteps key={r.id} room={r} />
      ))}

      {segments.map((s, i) => {
        const t = s.exterior ? WALL_OUTER : WALL_INNER;
        return s.orient === "h" ? (
          <rect key={i} x={s.a - t / 2} y={s.c - t / 2} width={s.b - s.a + t} height={t} fill="#262626" />
        ) : (
          <rect key={i} x={s.c - t / 2} y={s.a - t / 2} width={t} height={s.b - s.a + t} fill="#262626" />
        );
      })}

      {openings.map((o) => (
        <OpeningSymbol key={o.id} o={o} />
      ))}

      {floor.rooms.map((r) => (
        <RoomLabel key={`l${r.id}`} room={r} />
      ))}

      {selectedRoomId &&
        floor.rooms
          .filter((r) => r.id === selectedRoomId)
          .map((r) => (
            <rect key="sel" data-export="skip" pointerEvents="none" x={r.x} y={r.y} width={r.w} height={r.h} fill="rgba(220,38,38,0.08)" stroke="#dc2626" strokeWidth={0.22} />
          ))}

      {showDimensions && (
        <g>
          <Dimension x1={0} y1={-2.4} x2={W} y2={-2.4} label={feet(W)} />
          <Dimension x1={-2.4} y1={0} x2={-2.4} y2={L} label={feet(L)} />
          <line x1={0} x2={W} y1={L + 1.6} y2={L + 1.6} stroke="#444" strokeWidth={0.3} />
          <text x={W / 2} y={L + 3.4} textAnchor="middle" fontSize={1.1} fontFamily="system-ui, sans-serif" fontWeight={700} fill="#444" letterSpacing={0.1}>
            ROAD / FRONT SIDE
          </text>
        </g>
      )}

      {overlay}
    </svg>
  );
}
