import { OPENING_SPECS, PARAPET, PLINTH, SLAB } from "./catalog";
import { absOpenings, boundaryLayout, cutWall, levels, topUsedFloor, totalHeight, wallSegments, type Level } from "./geometry";
import type { DesignData, GateKind, OpeningKind, Room, Side, ViewName } from "./types";

export type ElevKind = "wall" | "glass" | "door" | "slab" | "parapet" | "pillar" | "plinth" | "railing" | "boundary" | "gate" | "plants" | "tree";

export interface ElevShape {
  kind: ElevKind;
  u0: number;
  u1: number;
  /** Heights above the ground, feet. */
  z0: number;
  z1: number;
  /** Larger = nearer to the viewer; shapes are painted far to near. */
  depth: number;
  /** For doors and windows: which kind of opening it is. */
  detail?: OpeningKind;
  /** For gates in the boundary wall: main or small. */
  gate?: GateKind;
}

export interface Elevation {
  shapes: ElevShape[];
  /** Width of the plot as seen from this side. */
  span: number;
  height: number;
  levels: Level[];
}

export const VIEW_LABELS: Record<ViewName, string> = {
  front: "Front Elevation",
  back: "Rear Elevation",
  left: "Left Elevation",
  right: "Right Elevation",
};

const FACING: Record<ViewName, Side> = { front: "bottom", back: "top", left: "left", right: "right" };

/** The orthographic view of the house from one side: what a person standing
 *  on that side of the plot sees. Exterior walls that face the viewer, with
 *  their doors and windows, floor slabs, parapet and the porch canopy. */
export function computeElevation(design: DesignData, view: ViewName): Elevation {
  const { width: W, length: L } = design.plot;
  const horizontal = view === "front" || view === "back";
  const span = horizontal ? W : L;
  const mapU = (p: number): number => (view === "front" ? p : view === "back" ? W - p : view === "left" ? p : L - p);
  const depthOf = (c: number): number => (view === "front" || view === "right" ? c : -c);
  const lv = levels(design);
  const topFloor = topUsedFloor(design);
  const shapes: ElevShape[] = [];

  const push = (kind: ElevKind, pa: number, pb: number, z0: number, z1: number, depth: number, detail?: OpeningKind) => {
    const u0 = Math.min(mapU(pa), mapU(pb));
    const u1 = Math.max(mapU(pa), mapU(pb));
    if (u1 - u0 > 0.01 && z1 - z0 > 0.01) shapes.push({ kind, u0, u1, z0, z1, depth, detail });
  };

  shapes.push({ kind: "plinth", u0: 0, u1: span, z0: 0, z1: PLINTH, depth: -1e6 });

  design.floors.forEach((floor, f) => {
    const level = lv[f];
    const isTop = f === topFloor;
    const openings = absOpenings(floor.rooms);

    for (const seg of wallSegments(floor.rooms)) {
      if (!seg.exterior || seg.facing !== FACING[view]) continue;
      const depth = depthOf(seg.c);
      const { pieces, cuts } = cutWall(seg, openings, design.floorHeight);
      for (const p of pieces) push("wall", p.a, p.b, level.z0 + p.z0, level.z0 + p.z1, depth);
      for (const c of cuts) {
        const kind: ElevKind = OPENING_SPECS[c.kind].sill === 0 ? "door" : "glass";
        push(kind, c.a, c.b, level.z0 + c.sill, level.z0 + c.top, depth + 0.001, c.kind);
      }
      // Slab edge above this wall (with a small overhang), and the parapet on the roof.
      push("slab", seg.a - 0.3, seg.b + 0.3, level.z1, level.z1 + SLAB, depth + 0.002);
      if (isTop) push("parapet", seg.a - 0.3, seg.b + 0.3, level.z1 + SLAB, level.z1 + SLAB + PARAPET, depth + 0.003);
    }

    for (const room of floor.rooms) addOpenRoom(room, level, depthOf, push, view);
  });

  // The boundary wall on the side the viewer stands on, in front of everything.
  const bl = boundaryLayout(design);
  for (const piece of bl.pieces.filter((p) => p.side === FACING[view])) {
    const u0 = Math.min(mapU(piece.a), mapU(piece.b));
    const u1 = Math.max(mapU(piece.a), mapU(piece.b));
    if (u1 - u0 > 0.01) shapes.push({ kind: "boundary", u0, u1, z0: 0, z1: bl.height, depth: 1e5 });
  }
  for (const gt of bl.gates.filter((g) => g.side === FACING[view])) {
    const u0 = Math.min(mapU(gt.a), mapU(gt.b));
    const u1 = Math.max(mapU(gt.a), mapU(gt.b));
    shapes.push({ kind: "gate", u0, u1, z0: 0, z1: Math.max(1, bl.height - 0.3), depth: 1e5 + 0.01, gate: gt.kind });
  }

  return { shapes: shapes.sort((p, q) => p.depth - q.depth), span, height: totalHeight(design), levels: lv.slice(0, topFloor + 1) };
}

function addOpenRoom(
  room: Room,
  level: Level,
  depthOf: (c: number) => number,
  push: (kind: ElevKind, pa: number, pb: number, z0: number, z1: number, depth: number, detail?: OpeningKind) => void,
  view: ViewName
) {
  if (room.type !== "porch" && room.type !== "balcony" && room.type !== "plants" && room.type !== "tree") return;
  const horizontal = view === "front" || view === "back";
  const pa = horizontal ? room.x : room.y;
  const pb = horizontal ? room.x + room.w : room.y + room.h;
  // The edge nearest to the viewer.
  const near = view === "front" ? room.y + room.h : view === "back" ? room.y : view === "left" ? room.x : room.x + room.w;
  const depth = depthOf(near) + 0.01;

  if (room.type === "plants") {
    push("plants", pa, pb, 0, 2.6, depth);
    return;
  }
  if (room.type === "tree") {
    push("tree", pa, pb, 0, 14, depth);
    return;
  }

  if (room.type === "porch") {
    push("slab", pa - 0.2, pb + 0.2, level.z1, level.z1 + SLAB, depth);
    push("pillar", pa, pa + 1, level.z0, level.z1, depth);
    push("pillar", pb - 1, pb, level.z0, level.z1, depth);
  } else {
    push("slab", pa, pb, level.z0 - SLAB, level.z0, depth);
    push("railing", pa, pb, level.z0, level.z0 + 3, depth);
  }
}
