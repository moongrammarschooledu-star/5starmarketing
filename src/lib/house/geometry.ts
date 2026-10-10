import { newId, OPENING_SPECS, PARAPET, PLINTH, ROOM_SPECS, SLAB, SQFT_PER_MARLA } from "./catalog";
import type { DesignData, Floor, GateKind, Room, Side } from "./types";

const EPS = 0.01;
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------- walls

export interface WallSegment {
  /** "h" runs along x (a top/bottom wall), "v" runs along y (a left/right wall). */
  orient: "h" | "v";
  /** The fixed coordinate of the wall's centre line. */
  c: number;
  a: number;
  b: number;
  /** Only one room (or one side) touches this wall. */
  exterior: boolean;
  /** Which way an exterior wall faces (towards the outside). */
  facing: Side | null;
}

interface Edge {
  orient: "h" | "v";
  c: number;
  a: number;
  b: number;
  side: Side;
}

/** Turns the room rectangles of one floor into wall segments. A wall shared
 *  by two rooms becomes one interior segment instead of two overlapping ones,
 *  and a wall touching only one room is an exterior wall. Open rooms (lawn,
 *  porch, balcony) have no walls of their own. */
export function wallSegments(rooms: Room[]): WallSegment[] {
  const edges: Edge[] = [];
  for (const r of rooms) {
    if (ROOM_SPECS[r.type].open) continue;
    edges.push({ orient: "h", c: r.y, a: r.x, b: r.x + r.w, side: "top" });
    edges.push({ orient: "h", c: r.y + r.h, a: r.x, b: r.x + r.w, side: "bottom" });
    edges.push({ orient: "v", c: r.x, a: r.y, b: r.y + r.h, side: "left" });
    edges.push({ orient: "v", c: r.x + r.w, a: r.y, b: r.y + r.h, side: "right" });
  }

  const groups = new Map<string, Edge[]>();
  for (const e of edges) {
    const key = `${e.orient}:${round2(e.c)}`;
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }

  const out: WallSegment[] = [];
  for (const list of groups.values()) {
    const points = [...new Set(list.flatMap((e) => [round2(e.a), round2(e.b)]))].sort((p, q) => p - q);
    let prev: WallSegment | null = null;
    for (let i = 0; i < points.length - 1; i++) {
      const p = points[i];
      const q = points[i + 1];
      if (q - p < EPS) continue;
      const covering = list.filter((e) => e.a <= p + EPS && e.b >= q - EPS);
      if (covering.length === 0) {
        prev = null;
        continue;
      }
      const sides = new Set(covering.map((e) => e.side));
      const exterior = sides.size === 1;
      const facing = exterior ? [...sides][0] : null;
      if (prev && Math.abs(prev.b - p) < EPS && prev.exterior === exterior && prev.facing === facing) {
        prev.b = q;
      } else {
        prev = { orient: list[0].orient, c: list[0].c, a: p, b: q, exterior, facing };
        out.push(prev);
      }
    }
  }
  return out;
}

// ------------------------------------------------------------- openings

export interface AbsOpening {
  id: string;
  kind: keyof typeof OPENING_SPECS;
  orient: "h" | "v";
  c: number;
  a: number;
  b: number;
  side: Side;
  roomId: string;
}

/** Every door and window of a floor in plan coordinates. */
export function absOpenings(rooms: Room[]): AbsOpening[] {
  const out: AbsOpening[] = [];
  for (const r of rooms) {
    if (ROOM_SPECS[r.type].open) continue;
    for (const o of r.openings) {
      const horizontal = o.side === "top" || o.side === "bottom";
      const start = horizontal ? r.x : r.y;
      const end = horizontal ? r.x + r.w : r.y + r.h;
      const a = Math.max(start, start + o.offset);
      const b = Math.min(end, start + o.offset + o.width);
      if (b - a < 0.2) continue;
      const c = o.side === "top" ? r.y : o.side === "bottom" ? r.y + r.h : o.side === "left" ? r.x : r.x + r.w;
      out.push({ id: o.id, kind: o.kind, orient: horizontal ? "h" : "v", c, a, b, side: o.side, roomId: r.id });
    }
  }
  return out;
}

export interface WallPiece {
  a: number;
  b: number;
  /** Height range above the floor level of the storey. */
  z0: number;
  z1: number;
}

export interface CutOpening {
  id: string;
  kind: keyof typeof OPENING_SPECS;
  a: number;
  b: number;
  sill: number;
  top: number;
  side: Side;
}

/** Splits a wall segment into the solid pieces around its doors and windows. */
export function cutWall(seg: WallSegment, openings: AbsOpening[], storeyHeight: number): { pieces: WallPiece[]; cuts: CutOpening[] } {
  const cuts: CutOpening[] = openings
    .filter((o) => o.orient === seg.orient && Math.abs(o.c - seg.c) < 0.05 && o.b > seg.a + EPS && o.a < seg.b - EPS)
    .map((o) => {
      const spec = OPENING_SPECS[o.kind];
      const sill = Math.min(spec.sill, storeyHeight - 1);
      return { id: o.id, kind: o.kind, a: Math.max(o.a, seg.a), b: Math.min(o.b, seg.b), sill, top: Math.min(storeyHeight, sill + spec.height), side: o.side };
    })
    .sort((p, q) => p.a - q.a);

  const kept: CutOpening[] = [];
  for (const cut of cuts) {
    if (kept.length === 0 || cut.a >= kept[kept.length - 1].b - EPS) kept.push(cut);
  }

  const pieces: WallPiece[] = [];
  let cursor = seg.a;
  for (const cut of kept) {
    if (cut.a > cursor + EPS) pieces.push({ a: cursor, b: cut.a, z0: 0, z1: storeyHeight });
    if (cut.sill > EPS) pieces.push({ a: cut.a, b: cut.b, z0: 0, z1: cut.sill });
    if (cut.top < storeyHeight - EPS) pieces.push({ a: cut.a, b: cut.b, z0: cut.top, z1: storeyHeight });
    cursor = cut.b;
  }
  if (seg.b > cursor + EPS) pieces.push({ a: cursor, b: seg.b, z0: 0, z1: storeyHeight });
  return { pieces, cuts: kept };
}

// ----------------------------------------------------------- boundary wall

export interface BoundaryPiece {
  side: Side;
  /** "h" runs along x (front / back wall), "v" along y (left / right wall). */
  orient: "h" | "v";
  /** The fixed coordinate of the wall line. */
  c: number;
  a: number;
  b: number;
}

export interface BoundaryGateRect {
  id: string;
  kind: GateKind;
  side: Side;
  orient: "h" | "v";
  c: number;
  a: number;
  b: number;
}

/** The boundary wall as solid pieces between its gates, plus the gates, in plan feet. */
export function boundaryLayout(design: DesignData): { pieces: BoundaryPiece[]; gates: BoundaryGateRect[]; height: number } {
  const bd = design.boundary;
  if (!bd) return { pieces: [], gates: [], height: 0 };
  const { width: W, length: L } = design.plot;
  const sides: Side[] = ["top", "bottom", "left", "right"];
  const pieces: BoundaryPiece[] = [];
  const gates: BoundaryGateRect[] = [];

  for (const side of sides) {
    if (!bd.walls[side]) continue;
    const orient = side === "top" || side === "bottom" ? "h" : "v";
    const len = orient === "h" ? W : L;
    const c = side === "top" ? 0 : side === "bottom" ? L : side === "left" ? 0 : W;
    const onSide = bd.gates
      .filter((gt) => gt.side === side)
      .map((gt) => {
        const width = Math.min(gt.width, len);
        const a = Math.min(Math.max(0, gt.offset), Math.max(0, len - width));
        return { gt, a, b: a + width };
      })
      .sort((p, q) => p.a - q.a);
    let cursor = 0;
    for (const o of onSide) {
      if (o.a > cursor + EPS) pieces.push({ side, orient, c, a: cursor, b: o.a });
      gates.push({ id: o.gt.id, kind: o.gt.kind, side, orient, c, a: o.a, b: o.b });
      cursor = Math.max(cursor, o.b);
    }
    if (len > cursor + EPS) pieces.push({ side, orient, c, a: cursor, b: len });
  }
  return { pieces, gates, height: bd.height };
}

// --------------------------------------------------------------- levels

export interface Level {
  /** Top of the floor finish of this storey. */
  z0: number;
  /** Underside of the ceiling slab. */
  z1: number;
}

/** Heights of every storey: the ground floor sits on a plinth, each upper
 *  floor starts on top of the slab of the one below. */
export function levels(design: DesignData): Level[] {
  const out: Level[] = [];
  let z = PLINTH;
  for (let i = 0; i < design.floors.length; i++) {
    out.push({ z0: z, z1: z + design.floorHeight });
    z = z + design.floorHeight + SLAB;
  }
  return out;
}

/** The highest floor that actually has rooms (an empty upper floor adds no height). */
export function topUsedFloor(design: DesignData): number {
  for (let i = design.floors.length - 1; i >= 0; i--) {
    if (design.floors[i].rooms.some((r) => !ROOM_SPECS[r.type].open)) return i;
  }
  return 0;
}

export function totalHeight(design: DesignData): number {
  const l = levels(design);
  return l[topUsedFloor(design)].z1 + SLAB + PARAPET;
}

// ------------------------------------------------------ checks and sums

export function roomArea(r: Room): number {
  return Math.round(r.w * r.h * 100) / 100;
}

function overlap(a: Room, b: Room): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  // Slivers thinner than an inch are drawing noise, not real overlaps.
  return w > 0.08 && h > 0.08 ? w * h : 0;
}

/** Plain-language problems the designer should look at. */
export function designWarnings(design: DesignData): string[] {
  const out: string[] = [];
  const { width, length } = design.plot;
  for (const floor of design.floors) {
    const rooms = floor.rooms;
    for (const r of rooms) {
      if (r.x < -EPS || r.y < -EPS || r.x + r.w > width + EPS || r.y + r.h > length + EPS) {
        out.push(`${floor.name}: "${r.name}" goes outside the plot.`);
      }
    }
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        if (overlap(rooms[i], rooms[j]) > 0.25) out.push(`${floor.name}: "${rooms[i].name}" and "${rooms[j].name}" overlap.`);
      }
    }
  }
  return out;
}

export interface ScheduleRow {
  floor: string;
  name: string;
  typeLabel: string;
  w: number;
  h: number;
  area: number;
}

export interface Schedule {
  rows: ScheduleRow[];
  floorAreas: { name: string; covered: number }[];
  plotArea: number;
  plotMarla: number;
  groundCovered: number;
  groundCoveragePct: number;
  totalCovered: number;
}

export function buildSchedule(design: DesignData): Schedule {
  const rows: ScheduleRow[] = [];
  const floorAreas: { name: string; covered: number }[] = [];
  for (const floor of design.floors) {
    let covered = 0;
    for (const r of floor.rooms) {
      const area = roomArea(r);
      rows.push({ floor: floor.name, name: r.name, typeLabel: ROOM_SPECS[r.type].label, w: r.w, h: r.h, area });
      if (ROOM_SPECS[r.type].covered) covered += area;
    }
    floorAreas.push({ name: floor.name, covered: Math.round(covered * 100) / 100 });
  }
  const plotArea = design.plot.width * design.plot.length;
  const groundCovered = floorAreas[0]?.covered ?? 0;
  return {
    rows,
    floorAreas,
    plotArea,
    plotMarla: Math.round((plotArea / SQFT_PER_MARLA) * 100) / 100,
    groundCovered,
    groundCoveragePct: plotArea > 0 ? Math.round((groundCovered / plotArea) * 1000) / 10 : 0,
    totalCovered: Math.round(floorAreas.reduce((s, f) => s + f.covered, 0) * 100) / 100,
  };
}

/** A copy of a floor's rooms with fresh ids (for "copy ground floor layout"). */
export function cloneRooms(rooms: Room[]): Room[] {
  return rooms.map((r) => ({ ...r, id: newId("r"), openings: r.openings.map((o) => ({ ...o, id: newId("o") })) }));
}

export function cloneFloor(floor: Floor, name: string): Floor {
  return { id: newId("f"), name, rooms: cloneRooms(floor.rooms) };
}
