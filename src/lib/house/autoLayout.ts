import { DEFAULT_FLOOR_HEIGHT, OPENING_SPECS, ROOM_SPECS, SQFT_PER_MARLA, emptyDesign, newId } from "./catalog";
import type { DesignData, Opening, OpeningKind, Room, RoomType, Side } from "./types";

// Makes a complete house plan from a plot size and a list of the rooms the
// client wants. The covered part of the plot is cut into horizontal bands
// (front band first); each band is filled left to right with rooms whose
// widths follow their wanted areas, so the rooms tile the house exactly. Then
// doors are placed so that every room can be reached from the entrance, and
// windows on the outside walls.

export interface AutoSpec {
  width: number;
  length: number;
  floors: number;
  floorHeight: number;
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  lounges: number;
  drawing: boolean;
  dining: boolean;
  stores: number;
  prayer: boolean;
  study: boolean;
  garage: boolean;
  porch: boolean;
  lawn: boolean;
}

export const DEFAULT_AUTO_SPEC: AutoSpec = {
  width: 25,
  length: 45,
  floors: 1,
  floorHeight: DEFAULT_FLOOR_HEIGHT,
  bedrooms: 3,
  bathrooms: 3,
  kitchens: 1,
  lounges: 1,
  drawing: true,
  dining: false,
  stores: 1,
  prayer: false,
  study: false,
  garage: false,
  porch: true,
  lawn: true,
};

export interface AutoResult {
  design: DesignData;
  /** Plain-language remarks for the person who asked (tight rooms, dropped items...). */
  notes: string[];
}

// ------------------------------------------------------------------ units

interface Unit {
  type: RoomType;
  name: string;
  /** Wanted area in sq ft (used to share a band's width). */
  area: number;
  /** A fixed width in feet (baths, stairs); the depth is the band's depth. */
  fixedW?: number;
  /** Instead of a fixed width: a wanted area, so the width follows the band depth. */
  fixedArea?: number;
  minW: number;
  minH: number;
  /** The bedroom number this bath belongs to (it must touch it and open only to it). */
  attachedTo?: number;
  /** Set on bedrooms: their number. */
  bedNo?: number;
}

/** Units that stay together in one band (a bedroom with its bath, a hall with the stairs). */
type Group = Unit[];

interface Placed {
  unit: Unit;
  room: Room;
}

const EPS = 0.01;
const r2 = (n: number) => Math.round(n * 100) / 100;

function bedroomUnit(n: number, big: boolean): Unit {
  return { type: "bedroom", name: n === 1 ? "Master Bedroom" : `Bedroom ${n}`, area: n === 1 && big ? 195 : 150, minW: 10, minH: 10, bedNo: n };
}
function attachedBath(label: string, bedroomIndex: number): Unit {
  return { type: "bathroom", name: label, area: 54, fixedArea: 48, minW: 4.5, minH: 6, attachedTo: bedroomIndex };
}
function commonBath(n: number): Unit {
  return { type: "bathroom", name: n === 1 ? "Bath" : `Bath ${n}`, area: 54, fixedArea: 48, minW: 4.5, minH: 6 };
}

const STAIRS: Unit = { type: "stairs", name: "Stairs", area: 50, fixedW: 4.5, minW: 4, minH: 9 };

interface FloorUnits {
  groups: Group[];
}

function splitBedrooms(total: number, floors: number): number[] {
  if (floors <= 1) return [total];
  const ground = Math.min(total, Math.max(1, Math.floor(total / floors)));
  const rest = total - ground;
  const upper = floors - 1;
  const out = [ground];
  for (let i = 0; i < upper; i++) out.push(Math.floor(rest / upper) + (i < rest % upper ? 1 : 0));
  return out;
}

function buildUnits(spec: AutoSpec): FloorUnits[] {
  const floors = spec.floors;
  const big = spec.width * spec.length >= 1500;
  const perFloor = splitBedrooms(spec.bedrooms, floors);

  // Bathrooms: keep one common bath, the rest are attached to bedrooms.
  const B = spec.bathrooms;
  const attached = Math.max(0, Math.min(spec.bedrooms, B > spec.bedrooms ? spec.bedrooms : B - 1));
  const common = Math.max(B > 0 ? 1 : 0, B - attached);

  const out: FloorUnits[] = [];
  let bedNo = 0;
  let attachedLeft = attached;
  let commonLeft = common;
  let bathNo = 0;

  for (let f = 0; f < floors; f++) {
    const groups: Group[] = [];
    const ground = f === 0;

    if (ground) {
      if (spec.drawing) groups.push([{ type: "drawing", name: "Drawing Room", area: big ? 190 : 165, minW: 10, minH: 10 }]);
      if (spec.study) groups.push([{ type: "office", name: "Study", area: 100, minW: 8, minH: 8 }]);
    }

    // The hall: the lounge (or a plain hall upstairs) together with the stairs.
    const hallArea = ground ? (big ? 230 : 200) : 130;
    const hasLounge = ground ? spec.lounges >= 1 : true;
    if (floors > 1) {
      const hall: Unit = { type: "lounge", name: ground ? "TV Lounge" : spec.lounges >= 2 && f === 1 ? "Family Lounge" : "Upper Hall", area: hallArea, minW: 8, minH: 9 };
      groups.push([hall, { ...STAIRS }]);
    } else if (hasLounge && ground) {
      for (let i = 0; i < spec.lounges; i++) groups.push([{ type: "lounge", name: i === 0 ? "TV Lounge" : `Lounge ${i + 1}`, area: hallArea, minW: 10, minH: 10 }]);
    }

    if (ground) {
      if (spec.dining) groups.push([{ type: "dining", name: "Dining", area: 120, minW: 8, minH: 9 }]);
      if (spec.prayer) groups.push([{ type: "prayer", name: "Prayer Room", area: 40, fixedArea: 36, minW: 5, minH: 5 }]);
      for (let i = 0; i < spec.stores; i++) groups.push([{ type: "store", name: spec.stores > 1 ? `Store ${i + 1}` : "Store", area: 35, fixedArea: 30, minW: 4, minH: 4 }]);
    }

    // A common bath near the middle of the house, one per floor while they last.
    if (commonLeft > 0 && (ground || commonLeft > 1 || attachedLeft === 0)) {
      bathNo++;
      groups.push([commonBath(bathNo === 1 && common === 1 ? 1 : bathNo)]);
      commonLeft--;
    }

    if (ground) {
      for (let i = 0; i < spec.kitchens; i++) {
        groups.push([{ type: "kitchen", name: spec.kitchens > 1 ? `Kitchen ${i + 1}` : "Kitchen", area: big ? 135 : 110, minW: 7.5, minH: 8 }]);
      }
    }

    for (let i = 0; i < perFloor[f]; i++) {
      bedNo++;
      const g: Group = [bedroomUnit(bedNo, big)];
      if (attachedLeft > 0) {
        g.push(attachedBath(`Attached Bath ${bedNo}`, bedNo));
        attachedLeft--;
      }
      groups.push(g);
    }
    out.push({ groups });
  }
  return out;
}

// ------------------------------------------------------------ band layout

interface Band {
  groups: Group[];
}

function groupArea(g: Group): number {
  return g.reduce((s, u) => s + u.area, 0);
}

/** Every way to cut an ordered list of n groups into R non-empty consecutive bands. */
function compositions(n: number, R: number, allowEmpty = false): number[][] {
  const out: number[][] = [];
  const rec = (left: number, parts: number[]) => {
    const bandsLeft = R - parts.length;
    if (bandsLeft === 1) {
      if (allowEmpty || left >= 1) out.push([...parts, left]);
      return;
    }
    const min = allowEmpty ? 0 : 1;
    for (let k = min; k <= left - (allowEmpty ? 0 : bandsLeft - 1); k++) rec(left - k, [...parts, k]);
  };
  rec(n, []);
  return out;
}

function isHall(g: Group): boolean {
  return g.some((u) => u.type === "stairs");
}

/** The hall (lounge + stairs) always stands first in its band, so the stairs
 *  are at the same place on every floor. */
function hallFirst(bands: Band[]): Band[] {
  for (const b of bands) {
    const i = b.groups.findIndex(isHall);
    if (i > 0) b.groups.unshift(...b.groups.splice(i, 1));
  }
  return bands;
}

function bandsFromSizes(groups: Group[], sizes: number[]): Band[] {
  const bands: Band[] = [];
  let at = 0;
  for (const s of sizes) {
    // Bedroom + bath pairs alternate (bath, bedroom) (bedroom, bath): baths end up on the
    // outer walls and neighbouring bedrooms touch each other.
    let pair = 0;
    bands.push({
      groups: groups.slice(at, at + s).map((g) => {
        if (g.length === 2 && g[0].type === "bedroom" && g[1].type === "bathroom") return pair++ % 2 === 0 ? [g[1], g[0]] : g;
        return g;
      }),
    });
    at += s;
  }
  return hallFirst(bands);
}
/** Widths of the units of one band so that they fill `total` exactly. */
function bandWidths(units: Unit[], total: number): number[] {
  const widths = units.map((u) => u.fixedW ?? 0);
  let free = total - widths.reduce((s, w) => s + w, 0);
  let flexible = units.map((u, i) => ({ u, i })).filter(({ u }) => u.fixedW === undefined);
  if (flexible.length === 0) {
    // Everything is fixed: stretch them all equally.
    const extra = (total - widths.reduce((s, w) => s + w, 0)) / units.length;
    return widths.map((w) => w + extra);
  }
  // Enforce minimum widths by freezing the ones that would be too narrow.
  for (let pass = 0; pass < 4; pass++) {
    const area = flexible.reduce((s, { u }) => s + u.area, 0);
    let changed = false;
    for (const { u, i } of flexible) {
      const w = (free * u.area) / area;
      if (w < u.minW - EPS && widths[i] === 0) {
        widths[i] = u.minW;
        changed = true;
      }
    }
    if (!changed) break;
    free = total - widths.reduce((s, w) => s + w, 0);
    flexible = flexible.filter(({ i }) => widths[i] === 0);
    if (flexible.length === 0) break;
  }
  const area = flexible.reduce((s, { u }) => s + u.area, 0);
  for (const { u, i } of flexible) widths[i] = Math.max(1, (Math.max(free, 0) * u.area) / Math.max(area, 1));
  // If minimum widths used more than the band has, scale everything back.
  const sum = widths.reduce((s, w) => s + w, 0);
  return widths.map((w) => (w * total) / sum);
}

function withHallWidth(units: Unit[], hallWidth?: number): Unit[] {
  if (hallWidth === undefined) return units;
  // A hall's lounge keeps the same width on every floor so the stairs line up.
  return units.map((u, i) => (u.type === "lounge" && units[i + 1]?.type === "stairs" ? { ...u, fixedW: hallWidth } : u));
}

/** Turns wanted areas (baths, stores) into widths for a band of this depth. */
function resolveFixed(units: Unit[], depth: number): Unit[] {
  return units.map((u) => (u.fixedW === undefined && u.fixedArea !== undefined ? { ...u, fixedW: Math.min(7, Math.max(u.minW, Math.round((u.fixedArea / depth) * 2) / 2)) } : u));
}

function bandCost(bands: Band[], depths: number[], width: number, hallWidth?: number): number {
  let cost = 0;
  bands.forEach((band, bi) => {
    const units = resolveFixed(withHallWidth(band.groups.flat(), hallWidth), depths[bi]);
    if (units.length === 0) {
      cost += 4;
      return;
    }
    if (units.some((u) => u.type === "stairs") && units.every((u) => u.fixedW !== undefined) && units.reduce((s, u) => s + (u.fixedW ?? 0), 0) < width - 3) cost += 15;
    if (depths[bi] < 9) cost += 30 * (9 - depths[bi]);
    if (depths[bi] > 20) cost += 8 * (depths[bi] - 20);
    const widths = bandWidths(units, width);
    const h = depths[bi];
    units.forEach((u, i) => {
      const w = widths[i];
      if (w < u.minW - EPS) cost += 40 * (u.minW - w);
      if (h < u.minH - EPS) cost += 40 * (u.minH - h);
      const aspect = Math.max(w, h) / Math.max(1, Math.min(w, h));
      const limit = u.type === "stairs" ? 3.2 : u.type === "bathroom" || u.type === "store" || u.type === "prayer" ? 2.2 : 1.9;
      if (aspect > limit) cost += 6 * (aspect - limit) ** 2;
      if (u.type === "bathroom" && w * h > 90) cost += (w * h - 90) * 0.3;
    });
  });
  return cost;
}

// --------------------------------------------------------------- geometry

function exteriorIntervals(room: Room, side: Side, others: Room[]): [number, number][] {
  const horizontal = side === "top" || side === "bottom";
  const start = horizontal ? room.x : room.y;
  const end = horizontal ? room.x + room.w : room.y + room.h;
  const line = side === "top" ? room.y : side === "bottom" ? room.y + room.h : side === "left" ? room.x : room.x + room.w;
  let free: [number, number][] = [[start, end]];
  for (const o of others) {
    if (o.id === room.id || ROOM_SPECS[o.type].open) continue;
    const ol = side === "top" ? o.y + o.h : side === "bottom" ? o.y : side === "left" ? o.x + o.w : o.x;
    if (Math.abs(ol - line) > 0.05) continue;
    const os = horizontal ? o.x : o.y;
    const oe = horizontal ? o.x + o.w : o.y + o.h;
    free = free.flatMap(([a, b]) => {
      if (oe <= a + EPS || os >= b - EPS) return [[a, b] as [number, number]];
      const out: [number, number][] = [];
      if (os > a + EPS) out.push([a, os]);
      if (oe < b - EPS) out.push([oe, b]);
      return out;
    });
  }
  return free.filter(([a, b]) => b - a > EPS);
}

interface Shared {
  a: Room;
  b: Room;
  /** Side of `a` that touches `b`. */
  sideOfA: Side;
  from: number;
  to: number;
}

/** Walls shared by two solid rooms of one floor. */
function sharedWalls(rooms: Room[]): Shared[] {
  const out: Shared[] = [];
  const solid = rooms.filter(isWalled);
  for (let i = 0; i < solid.length; i++) {
    for (let j = 0; j < solid.length; j++) {
      if (i === j) continue;
      const a = solid[i];
      const b = solid[j];
      // b is below a (a's bottom touches b's top)
      if (Math.abs(a.y + a.h - b.y) < 0.05) {
        const from = Math.max(a.x, b.x);
        const to = Math.min(a.x + a.w, b.x + b.w);
        if (to - from > 0.5) {
          out.push({ a, b, sideOfA: "bottom", from, to });
          out.push({ a: b, b: a, sideOfA: "top", from, to });
        }
      }
      // b is to the right of a
      if (Math.abs(a.x + a.w - b.x) < 0.05) {
        const from = Math.max(a.y, b.y);
        const to = Math.min(a.y + a.h, b.y + b.h);
        if (to - from > 0.5) {
          out.push({ a, b, sideOfA: "right", from, to });
          out.push({ a: b, b: a, sideOfA: "left", from, to });
        }
      }
    }
  }
  return out;
}

/** Rooms with walls, plus an open terrace upstairs (doors may lead onto it). */
function isWalled(r: Room): boolean {
  return !ROOM_SPECS[r.type].open || r.name === "Open Terrace";
}

const OPPOSITE: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };

function addOpening(room: Room, kind: OpeningKind, side: Side, centre: number, width?: number) {
  const horizontal = side === "top" || side === "bottom";
  const start = horizontal ? room.x : room.y;
  const w = width ?? OPENING_SPECS[kind].width;
  room.openings.push({ id: newId("o"), kind, side, offset: r2(centre - w / 2 - start), width: w } as Opening);
}

// ------------------------------------------------------------------ doors

function hubRank(t: RoomType): number {
  switch (t) {
    case "lounge": return 6;
    case "dining": return 5;
    case "drawing": return 4;
    case "stairs": return 4;
    case "porch": return 4;
    case "balcony": return 3;
    case "office": return 2;
    case "prayer": return 2;
    case "store": return 1;
    case "kitchen": return 1;
    default: return 0;
  }
}

interface Box {
  cx: number;
  cy: number;
  cw: number;
  cl: number;
}

/** Top and bottom edge of every band (band 0 is the front, at the bottom of the
 *  plan). Edges snap to 6 inches; the last band ends exactly at the back edge. */
function bandEdges(depths: number[], box: Box): { top: number; bottom: number }[] {
  let bottom = box.cy + box.cl;
  let cumulative = 0;
  return depths.map((d, i) => {
    cumulative += d;
    const top = i === depths.length - 1 ? box.cy : Math.round((box.cy + box.cl - cumulative) * 2) / 2;
    const edge = { top, bottom };
    bottom = top;
    return edge;
  });
}

/** Turns bands into rooms: band 0 is the front (bottom of the plan). */
function layoutBands(bands: Band[], depths: number[], box: Box, hallWidth?: number): Placed[] {
  const placed: Placed[] = [];
  const half = (n: number) => Math.round(n * 2) / 2;
  const edges = bandEdges(depths, box);
  bands.forEach((band, bi) => {
    const yTop = edges[bi].top;
    const h = edges[bi].bottom - yTop;
    let units = resolveFixed(withHallWidth(band.groups.flat(), hallWidth), h);
    let widths: number[];
    const fixedSum = units.reduce((s, u) => s + (u.fixedW ?? 0), 0);
    if (units.some((u) => u.type === "stairs") && units.every((u) => u.fixedW !== undefined) && fixedSum < box.cw - 0.5) {
      // Only the hall stands in this band: the rest of the width is an open terrace.
      widths = [...units.map((u) => u.fixedW as number), box.cw - fixedSum];
      units = [...units, { type: "balcony", name: "Open Terrace", area: 0, minW: 1, minH: 1 }];
    } else {
      widths = bandWidths(units, box.cw);
    }
    let x = box.cx;
    let run = 0;
    units.forEach((u, i) => {
      run += widths[i];
      const xRight = i === units.length - 1 ? box.cx + box.cw : half(box.cx + run);
      const room: Room = { id: newId("r"), type: u.type, name: u.name, x: r2(x), y: r2(yTop), w: r2(xRight - x), h: r2(h), openings: [] };
      placed.push({ unit: u, room });
      x = xRight;
    });
  });
  return placed;
}

/** How many rooms cannot be reached by doors in this arrangement. */
function unreachableCount(bands: Band[], depths: number[], box: Box, ground: boolean, hallWidth?: number): number {
  const placed = layoutBands(bands, depths, box, hallWidth);
  const rooms = placed.map((p) => p.room);
  const frontY = box.cy + box.cl;
  const entrance = ground
    ? rooms.filter((r) => Math.abs(r.y + r.h - frontY) < 0.1).sort((p, q) => p.x - q.x)[0]
    : placed.find((p) => p.unit.type === "stairs")?.room ?? rooms[0];
  if (!entrance) return 0;
  return connectRooms(rooms, placed, entrance.id, true).stuck.length;
}

/** Opens doors so every room can be reached from `entrance`. A bath is only
 *  entered from its own bedroom (attached) or from a hall room (common). */
function connectRooms(rooms: Room[], placed: Placed[], entranceId: string, strict = false): { notes: string[]; stuck: string[] } {
  const notes: string[] = [];
  const shared = sharedWalls(rooms);
  const byId = new Map(placed.map((p) => [p.room.id, p]));
  const connected = new Set<string>([entranceId]);
  const solid = rooms.filter((r) => isWalled(r) && r.type !== "garage");

  const canPass = (from: Room, to: Room, relax: boolean): boolean => {
    const f = from.type;
    const t = to.type;
    const toUnit = byId.get(to.id)?.unit;
    if (t === "bathroom") {
      if (toUnit?.attachedTo !== undefined) return f === "bedroom" && byId.get(from.id)?.unit.bedNo === toUnit.attachedTo;
      return hubRank(f) >= 4 || relax;
    }
    if (f === "bathroom") return false;
    if (f === "bedroom") return relax;
    if (f === "kitchen") return t === "store" || relax;
    if (f === "stairs") return t !== "bedroom" || relax;
    return true;
  };

  const needed = solid.filter((s) => s.name !== "Open Terrace");
  let guard = 0;
  while (needed.some((s) => !connected.has(s.id)) && guard++ < 200) {
    for (const relax of strict ? [false] : [false, true]) {
      let best: { w: Shared; score: number } | null = null;
      for (const w of shared) {
        if (!connected.has(w.a.id) || connected.has(w.b.id)) continue;
        if (!solid.some((s) => s.id === w.b.id)) continue;
        const len = w.to - w.from;
        const need = relax ? 2.75 : w.b.type === "bathroom" ? 3 : 3.5;
        if (len < need) continue;
        if (!canPass(w.a, w.b, relax)) continue;
        const score = hubRank(w.a.type) * 10 + Math.min(len, 12) + (w.b.type === "bathroom" && byId.get(w.b.id)?.unit.attachedTo !== undefined ? 50 : 0);
        if (!best || score > best.score) best = { w, score };
      }
      if (best) {
        const { w } = best;
        const centre = (w.from + w.to) / 2;
        // The door belongs to the more private room, so it swings into it.
        const privacy = (t: RoomType) => (t === "bathroom" ? 3 : t === "bedroom" ? 2 : t === "kitchen" || t === "store" || t === "stairs" ? 1 : t === "balcony" ? -1 : 0);
        const holdA = privacy(w.a.type) > privacy(w.b.type);
        const holder = holdA ? w.a : w.b;
        const side = holdA ? w.sideOfA : OPPOSITE[w.sideOfA];
        addOpening(holder, "door", side, centre, w.a.type === "bathroom" || w.b.type === "bathroom" ? 2.5 : 3);
        connected.add(w.b.id);
        break;
      }
      if (relax || strict) {
        const stuck = needed.filter((s) => !connected.has(s.id)).map((s) => s.name);
        if (!strict) notes.push(`Check the doors: ${stuck.join(", ")} could not be connected automatically.`);
        return { notes, stuck };
      }
    }
  }
  return { notes, stuck: [] };
}

// ---------------------------------------------------------------- windows

function addWindows(rooms: Room[], skip: Map<string, [Side, number, number]>) {
  for (const room of rooms) {
    if (ROOM_SPECS[room.type].open || room.type === "garage") continue;
    const wide: Record<string, number> = { lounge: 5, drawing: 5, bedroom: 4, dining: 4, kitchen: 4, office: 4, prayer: 3 };
    const isBath = room.type === "bathroom";
    const isStairs = room.type === "stairs";
    const w = isBath ? 2 : isStairs ? 2.5 : wide[room.type];
    if (!w) continue;
    for (const side of ["top", "bottom", "left", "right"] as Side[]) {
      for (let [a, b] of exteriorIntervals(room, side, rooms)) {
        const blocked = skip.get(room.id);
        if (blocked && blocked[0] === side) {
          // Keep windows away from the main door on this wall.
          const left: [number, number] = [a, Math.min(b, blocked[1])];
          const right: [number, number] = [Math.max(a, blocked[2]), b];
          const piece = right[1] - right[0] >= left[1] - left[0] ? right : left;
          [a, b] = piece;
        }
        const len = b - a;
        if (len < w + 2) continue;
        const kind: OpeningKind = isBath ? "ventilator" : "window";
        const count = len >= 16 && !isBath && !isStairs ? 2 : 1;
        for (let k = 1; k <= count; k++) addOpening(room, kind, side, a + (len * k) / (count + 1), w);
        if (isBath || isStairs) break; // one is enough
      }
    }
  }
}

// ----------------------------------------------------------------- driver

export function generateDesign(input: AutoSpec): AutoResult {
  const spec: AutoSpec = {
    ...input,
    floors: Math.max(1, Math.min(3, Math.round(input.floors))),
    bedrooms: Math.max(0, Math.min(8, Math.round(input.bedrooms))),
    bathrooms: Math.max(0, Math.min(10, Math.round(input.bathrooms))),
    kitchens: Math.max(0, Math.min(2, Math.round(input.kitchens))),
    lounges: Math.max(0, Math.min(2, Math.round(input.lounges))),
    stores: Math.max(0, Math.min(3, Math.round(input.stores))),
  };
  const notes: string[] = [];
  const W = spec.width;
  const L = spec.length;
  const design = emptyDesign(W, L, spec.floors, spec.floorHeight || DEFAULT_FLOOR_HEIGHT);

  // ---- the open space in front (porch, garage, lawn) and side margins
  const bigPlot = W * L >= 2000;
  let frontDepth = spec.garage ? 18 : spec.porch || spec.lawn ? (bigPlot ? 12 : 8) : 0;
  if (L - frontDepth < 22) {
    if (spec.garage) {
      notes.push("The plot is too short for a garage with the rooms asked for, so the garage was left out.");
      spec.garage = false;
      frontDepth = spec.porch || spec.lawn ? 8 : 0;
    }
  }
  const sideMargin = W >= 40 ? 3 : 0;
  const rearMargin = L >= 70 ? 5 : 0;
  const cx = sideMargin;
  const cw = W - 2 * sideMargin;
  const cy = rearMargin;
  const cl = L - frontDepth - rearMargin;
  if (cl < 14 || cw < 14) {
    notes.push("This plot is too small to plan automatically. Please choose a bigger plot.");
    return { design, notes };
  }

  const floorUnits = buildUnits(spec);
  const totalArea = (fu: FloorUnits) => fu.groups.reduce((s, g) => s + groupArea(g), 0);

  // ---- ground floor: try every number of bands and every way to split the rooms
  const ground = floorUnits[0];
  const box: Box = { cx, cy, cw, cl };
  interface Candidate {
    bands: Band[];
    depths: number[];
    cost: number;
  }
  const candidates: Candidate[] = [];
  const raw: Candidate[] = [];
  for (let R = 2; R <= 6; R++) {
    if (cl / R < 8) break;
    if (R > ground.groups.length) break;
    for (const sizes of compositions(ground.groups.length, R)) {
      const bands = bandsFromSizes(ground.groups, sizes);
      const areas = bands.map((b) => b.groups.reduce((s, g) => s + groupArea(g), 0));
      const sum = areas.reduce((s, a) => s + a, 0);
      const depths = areas.map((a) => (a / sum) * cl);
      raw.push({ bands, depths, cost: bandCost(bands, depths, cw) });
    }
  }
  // The cheap size/shape cost ranks every split; only the best ones get the (slower) door check.
  raw.sort((p, q) => p.cost - q.cost);
  for (const c of raw.slice(0, 90)) candidates.push({ ...c, cost: c.cost + 30 * unreachableCount(c.bands, c.depths, box, true) });
  if (candidates.length === 0) {
    notes.push("Could not fit these rooms on the plot. Try fewer rooms or a bigger plot.");
    return { design, notes };
  }
  candidates.sort((p, q) => p.cost - q.cost);

  /** The width the hall's lounge gets on the ground floor (upper halls copy it). */
  const hallWidthOf = (c: Candidate): number | undefined => {
    const placed = layoutBands(c.bands, c.depths, box);
    const stairs = placed.find((p) => p.unit.type === "stairs");
    if (!stairs) return undefined;
    return placed.find((p) => p.unit.type === "lounge" && Math.abs(p.room.x + p.room.w - stairs.room.x) < 0.1 && Math.abs(p.room.y - stairs.room.y) < 0.1)?.room.w;
  };

  /** Best bands for an upper floor, with the hall in the ground floor's hall band. */
  const upperSearch = (fu: FloorUnits, depths: number[], hallBand: number, hallWidth?: number): { bands: Band[]; cost: number } => {
    const hall = fu.groups.find(isHall);
    const rest = fu.groups.filter((g) => g !== hall);
    const options: { bands: Band[]; cost: number }[] = [];
    for (const sizes of compositions(rest.length, depths.length, true)) {
      const bands = bandsFromSizes(rest, sizes);
      if (hall && hallBand >= 0) bands[hallBand].groups.unshift(hall);
      options.push({ bands, cost: bandCost(bands, depths, cw, hallWidth) });
    }
    options.sort((p, q) => p.cost - q.cost);
    let bestUpper: { bands: Band[]; cost: number } | null = null;
    for (const o of options.slice(0, 45)) {
      const cost = o.cost + 30 * unreachableCount(o.bands, depths, box, false, hallWidth);
      if (!bestUpper || cost < bestUpper.cost) bestUpper = { bands: o.bands, cost };
    }
    return bestUpper ?? { bands: bandsFromSizes(fu.groups, [fu.groups.length]), cost: 0 };
  };

  // With several floors, the best few ground plans are tried together with the
  // floors above, so the ground bands also suit the bedrooms upstairs.
  let best = candidates[0];
  let bestUppers: Band[][] = [];
  let hallBand = -1;
  let hallWidth: number | undefined;
  let bestTotal = Infinity;
  for (const cand of candidates.slice(0, spec.floors > 1 ? 8 : 1)) {
    const hb = cand.bands.findIndex((b) => b.groups.some(isHall));
    const hw = hallWidthOf(cand);
    let total = cand.cost;
    const ups: Band[][] = [];
    for (let f = 1; f < spec.floors; f++) {
      const r = upperSearch(floorUnits[f], cand.depths, hb, hw);
      total += r.cost;
      ups.push(r.bands);
    }
    if (total < bestTotal) {
      bestTotal = total;
      best = cand;
      bestUppers = ups;
      hallBand = hb;
      hallWidth = hw;
    }
  }

  const scale = (cw * cl) / totalArea(ground);
  if (scale < 0.72) notes.push("The rooms are tight for this plot (they were made smaller than usual). Remove a room or use more floors for more comfortable sizes.");
  if (scale > 1.9) notes.push("The plot is large for these rooms, so the rooms came out big. Add more rooms if you want.");

  const groundPlaced = layoutBands(best.bands, best.depths, box);
  void hallBand;
  const floorsPlaced: Placed[][] = [groundPlaced];

  // ---- upper floors: same band depths, the stairs in the same place
  for (let f = 1; f < spec.floors; f++) {
    const depths = best.depths;
    const bands = bestUppers[f - 1];
    const placed = layoutBands(bands, depths, box, hallWidth);
    // Bands with no rooms become an open terrace.
    const edges = bandEdges(depths, box);
    bands.forEach((b, bi) => {
      if (b.groups.length > 0) return;
      placed.push({ unit: { type: "balcony", name: "Open Terrace", area: 0, minW: 1, minH: 1 }, room: { id: newId("r"), type: "balcony", name: "Open Terrace", x: cx, y: r2(edges[bi].top), w: cw, h: r2(edges[bi].bottom - edges[bi].top), openings: [] } });
    });
    floorsPlaced.push(placed);
  }
  // ---- front strip: porch, garage, lawn
  const strip: Room[] = [];
  const entranceUnit = groundPlaced.filter((p) => Math.abs(p.room.y + p.room.h - (cy + cl)) < 0.1).sort((p, q) => p.room.x - q.room.x)[0];
  const porchDepth = frontDepth >= 12 ? 10 : 8;
  let porchRect: { x: number; w: number } | null = null;
  const garageW = 10.5;
  if (frontDepth > 0) {
    const frontY = cy + cl;
    const ew = entranceUnit ? entranceUnit.room.w : cw;
    const ex = entranceUnit ? entranceUnit.room.x : cx;
    let pw = Math.max(8, Math.min(14, ew * 0.8));
    const limit = (spec.garage ? W - sideMargin - garageW - 0.5 : W - sideMargin) - ex;
    pw = Math.min(pw, limit);
    if (spec.porch && pw >= 6) {
      porchRect = { x: ex, w: r2(pw) };
      strip.push({ id: newId("r"), type: "porch", name: "Porch", x: ex, y: frontY, w: r2(pw), h: Math.min(porchDepth, frontDepth), openings: [] });
    }
    if (spec.garage) {
      strip.push({ id: newId("r"), type: "garage", name: "Garage", x: r2(W - sideMargin - garageW), y: frontY, w: garageW, h: frontDepth, openings: [] });
    }
    if (spec.lawn) {
      const leftEdge = porchRect ? porchRect.x + porchRect.w : 0;
      const rightEdge = spec.garage ? W - sideMargin - garageW : W;
      if (rightEdge - leftEdge >= 4) strip.push({ id: newId("r"), type: "lawn", name: "Lawn", x: r2(leftEdge), y: frontY, w: r2(rightEdge - leftEdge), h: frontDepth, openings: [] });
      if (porchRect && frontDepth > porchDepth + 2) {
        strip.push({ id: newId("r"), type: "lawn", name: "Lawn", x: porchRect.x, y: frontY + porchDepth, w: porchRect.w, h: r2(frontDepth - porchDepth), openings: [] });
      }
      if (porchRect && porchRect.x > 0.5) strip.push({ id: newId("r"), type: "lawn", name: "Lawn", x: 0, y: frontY, w: porchRect.x, h: frontDepth, openings: [] });
    }
  }

  // ---- doors, windows and finishing touches, floor by floor
  const floorRooms: Room[][] = floorsPlaced.map((pl) => pl.map((p) => p.room));
  floorsPlaced.forEach((placed, f) => {
    const rooms = placed.map((p) => p.room);
    const all = f === 0 ? [...rooms, ...strip] : rooms;
    const skip = new Map<string, [Side, number, number]>();

    // Entrance: ground = main door from the porch; upper = the stairs.
    let entrance: Room | undefined;
    if (f === 0) {
      entrance = entranceUnit?.room;
      if (entrance) {
        const porch = strip.find((s) => s.type === "porch");
        const overlapFrom = porch ? Math.max(entrance.x, porch.x) : entrance.x;
        const overlapTo = porch ? Math.min(entrance.x + entrance.w, porch.x + porch.w) : entrance.x + entrance.w;
        const centre = overlapTo > overlapFrom ? (overlapFrom + overlapTo) / 2 : entrance.x + entrance.w / 2;
        addOpening(entrance, "main_door", "bottom", centre, 4);
        skip.set(entrance.id, ["bottom", centre - 2.5, centre + 2.5]);
      }
    } else {
      entrance = placed.find((p) => p.unit.type === "stairs")?.room ?? placed[0]?.room;
    }
    if (entrance) notes.push(...connectRooms(rooms, placed, entrance.id).notes.filter((n) => !notes.includes(n)));

    // Garage: a wide gate on the road side.
    const garage = rooms.concat(strip).find((r) => r.type === "garage");
    if (garage && f === 0) addOpening(garage, "main_door", "bottom", garage.x + garage.w / 2, 9);

    // Balcony above the porch, reached from the front bedroom.
    if (f > 0 && porchRect) {
      const front = placed.filter((p) => Math.abs(p.room.y + p.room.h - (cy + cl)) < 0.1).sort((p, q) => p.room.x - q.room.x)[0];
      if (front && front.room.type === "bedroom") {
        const bx = Math.max(front.room.x, porchRect.x);
        const bw = Math.min(front.room.x + front.room.w, porchRect.x + porchRect.w) - bx;
        if (bw >= 5) {
          rooms.push({ id: newId("r"), type: "balcony", name: "Balcony", x: r2(bx), y: cy + cl, w: r2(bw), h: 4.5, openings: [] });
          addOpening(front.room, "door", "bottom", bx + bw / 2, 3.5);
          skip.set(front.room.id, ["bottom", bx + bw / 2 - 2.5, bx + bw / 2 + 2.5]);
        }
      }
    }

    addWindows(all.filter((r) => rooms.includes(r) || f === 0), skip);
    floorRooms[f] = f === 0 ? [...rooms, ...strip] : rooms;
  });

  design.floors.forEach((fl, i) => {
    fl.rooms = floorRooms[i] ?? [];
  });

  const bedsMade = floorRooms.flat().filter((r) => r.type === "bedroom").length;
  if (bedsMade !== spec.bedrooms) notes.push("Some bedrooms could not be placed. Please check the plan.");
  notes.push(
    `Plot ${W} x ${L} ft (${r2((W * L) / SQFT_PER_MARLA)} Marla), ${spec.floors} floor${spec.floors > 1 ? "s" : ""}: ${bedsMade} bedroom${bedsMade === 1 ? "" : "s"}, ${spec.bathrooms} bathroom${spec.bathrooms === 1 ? "" : "s"}.`
  );
  return { design, notes };
}
