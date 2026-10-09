"use client";

import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import { PlanSvg, PLAN_MARGIN } from "./PlanSvg";
import type { DesignData, Room } from "@/lib/house/types";

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface Drag {
  kind: "move" | "resize";
  roomId: string;
  handle?: Handle;
  startX: number;
  startY: number;
  orig: Room;
}

const MIN_SIZE = 2.5;
const EDGE_SNAP = 0.6;

export interface PlanEditorCanvasProps {
  design: DesignData;
  floorIndex: number;
  selectedRoomId: string | null;
  snap: number;
  showGrid: boolean;
  zoom: number;
  svgRef: Ref<SVGSVGElement>;
  onSelect: (roomId: string | null) => void;
  /** Called once when a drag starts (so the editor can remember the "before" state). */
  onDragStart: () => void;
  onRoomChange: (roomId: string, patch: Partial<Room>) => void;
  onDragEnd: () => void;
}

function snapTo(v: number, step: number): number {
  return Math.round(v / step) * step;
}

/** Snaps a value to the grid, and to a nearby edge of another room when one
 *  is close, so rooms click neatly against each other. */
function snapValue(v: number, step: number, edges: number[]): number {
  let best = snapTo(v, step);
  let bestDist = EDGE_SNAP;
  for (const e of edges) {
    const d = Math.abs(e - v);
    if (d < bestDist) {
      best = e;
      bestDist = d;
    }
  }
  return Math.round(best * 100) / 100;
}

export function PlanEditorCanvas({ design, floorIndex, selectedRoomId, snap, showGrid, zoom, svgRef, onSelect, onDragStart, onRoomChange, onDragEnd }: PlanEditorCanvasProps) {
  const floor = design.floors[floorIndex];
  const innerRef = useRef<SVGSVGElement | null>(null);
  const [pxPerFt, setPxPerFt] = useState(10);
  const designRef = useRef(design);
  const floorRef = useRef(floor);
  const snapRef = useRef(snap);
  designRef.current = design;
  floorRef.current = floor;
  snapRef.current = snap;

  const setRefs = useCallback(
    (node: SVGSVGElement | null) => {
      innerRef.current = node;
      if (typeof svgRef === "function") svgRef(node);
      else if (svgRef) (svgRef as { current: SVGSVGElement | null }).current = node;
    },
    [svgRef]
  );

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setPxPerFt(Math.max(2, el.clientWidth / (design.plot.width + 2 * PLAN_MARGIN)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [design.plot.width, zoom]);

  const toPlan = useCallback((clientX: number, clientY: number) => {
    const svg = innerRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const startDrag = useCallback(
    (e: React.PointerEvent, drag: Omit<Drag, "startX" | "startY">) => {
      e.stopPropagation();
      e.preventDefault();
      const start = toPlan(e.clientX, e.clientY);
      const d: Drag = { ...drag, startX: start.x, startY: start.y };
      onDragStart();

      const move = (ev: PointerEvent) => {
        const p = toPlan(ev.clientX, ev.clientY);
        const dx = p.x - d.startX;
        const dy = p.y - d.startY;
        const { plot } = designRef.current;
        const step = snapRef.current;
        const others = floorRef.current.rooms.filter((r) => r.id !== d.roomId);
        const xEdges = others.flatMap((r) => [r.x, r.x + r.w]);
        const yEdges = others.flatMap((r) => [r.y, r.y + r.h]);
        const o = d.orig;

        if (d.kind === "move") {
          // Snap whichever of the room's two edges is closest to a target.
          const left = snapValue(o.x + dx, step, xEdges);
          const right = snapValue(o.x + o.w + dx, step, xEdges);
          const useRightX = Math.abs(right - (o.x + o.w + dx)) < Math.abs(left - (o.x + dx)) && xEdges.includes(right);
          let x = useRightX ? right - o.w : left;
          const top = snapValue(o.y + dy, step, yEdges);
          const bottom = snapValue(o.y + o.h + dy, step, yEdges);
          const useBottomY = Math.abs(bottom - (o.y + o.h + dy)) < Math.abs(top - (o.y + dy)) && yEdges.includes(bottom);
          let y = useBottomY ? bottom - o.h : top;
          x = Math.min(Math.max(0, x), Math.max(0, plot.width - o.w));
          y = Math.min(Math.max(0, y), Math.max(0, plot.length - o.h));
          onRoomChange(d.roomId, { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
          return;
        }

        const h = d.handle ?? "se";
        let x0 = o.x;
        let x1 = o.x + o.w;
        let y0 = o.y;
        let y1 = o.y + o.h;
        if (h.includes("w")) x0 = snapValue(o.x + dx, step, xEdges);
        if (h.includes("e")) x1 = snapValue(o.x + o.w + dx, step, xEdges);
        if (h.includes("n")) y0 = snapValue(o.y + dy, step, yEdges);
        if (h.includes("s")) y1 = snapValue(o.y + o.h + dy, step, yEdges);
        x0 = Math.max(0, Math.min(x0, x1 - MIN_SIZE));
        y0 = Math.max(0, Math.min(y0, y1 - MIN_SIZE));
        x1 = Math.min(plot.width, Math.max(x1, x0 + MIN_SIZE));
        y1 = Math.min(plot.length, Math.max(y1, y0 + MIN_SIZE));
        onRoomChange(d.roomId, { x: x0, y: y0, w: Math.round((x1 - x0) * 100) / 100, h: Math.round((y1 - y0) * 100) / 100 });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        onDragEnd();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [onDragStart, onDragEnd, onRoomChange, toPlan]
  );

  const hs = Math.min(1.6, Math.max(0.5, 11 / pxPerFt));
  const selected = floor.rooms.find((r) => r.id === selectedRoomId);

  const handles = (r: Room): { id: Handle; x: number; y: number; cursor: string }[] => [
    { id: "nw", x: r.x, y: r.y, cursor: "nwse-resize" },
    { id: "n", x: r.x + r.w / 2, y: r.y, cursor: "ns-resize" },
    { id: "ne", x: r.x + r.w, y: r.y, cursor: "nesw-resize" },
    { id: "e", x: r.x + r.w, y: r.y + r.h / 2, cursor: "ew-resize" },
    { id: "se", x: r.x + r.w, y: r.y + r.h, cursor: "nwse-resize" },
    { id: "s", x: r.x + r.w / 2, y: r.y + r.h, cursor: "ns-resize" },
    { id: "sw", x: r.x, y: r.y + r.h, cursor: "nesw-resize" },
    { id: "w", x: r.x, y: r.y + r.h / 2, cursor: "ew-resize" },
  ];

  const overlay = (
    <g data-export="skip">
      {floor.rooms.map((r) => (
        <rect
          key={r.id}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          fill="transparent"
          style={{ cursor: "move" }}
          onPointerDown={(e) => {
            onSelect(r.id);
            startDrag(e, { kind: "move", roomId: r.id, orig: r });
          }}
        />
      ))}
      {selected &&
        handles(selected).map((h) => (
          <rect
            key={h.id}
            x={h.x - hs / 2}
            y={h.y - hs / 2}
            width={hs}
            height={hs}
            fill="#ffffff"
            stroke="#dc2626"
            strokeWidth={hs * 0.14}
            style={{ cursor: h.cursor }}
            onPointerDown={(e) => startDrag(e, { kind: "resize", roomId: selected.id, handle: h.id, orig: selected })}
          />
        ))}
    </g>
  );

  return (
    <div style={{ width: `${zoom * 100}%`, minWidth: "100%" }}>
      <PlanSvg
        design={design}
        floor={floor}
        selectedRoomId={selectedRoomId}
        showGrid={showGrid}
        svgRef={setRefs}
        overlay={overlay}
        className="block h-auto w-full"
        onPointerDown={(e) => {
          // A click on empty paper clears the selection.
          if (e.target === e.currentTarget || (e.target as Element).tagName === "rect") onSelect(null);
        }}
      />
    </div>
  );
}
