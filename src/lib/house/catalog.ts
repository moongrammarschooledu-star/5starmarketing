import type { Boundary, DesignData, Gate, GateKind, OpeningKind, Room, RoomType } from "./types";

export const SQFT_PER_MARLA = 225;

export interface RoomSpec {
  label: string;
  /** Fill colour on the plan. */
  color: string;
  /** Floor colour in the 3D view. */
  floor: string;
  w: number;
  h: number;
  /** No walls and no roof of its own (lawn, porch, balcony). */
  open: boolean;
  /** Counts toward the covered area. */
  covered: boolean;
}

export const ROOM_SPECS: Record<RoomType, RoomSpec> = {
  bedroom: { label: "Bedroom", color: "#fde7c8", floor: "#c9a77c", w: 12, h: 14, open: false, covered: true },
  bathroom: { label: "Bathroom", color: "#cfe9f5", floor: "#9fc3d6", w: 5, h: 8, open: false, covered: true },
  kitchen: { label: "Kitchen", color: "#fbd5d5", floor: "#d9a3a3", w: 9, h: 11, open: false, covered: true },
  lounge: { label: "TV Lounge", color: "#e2dcf5", floor: "#b3a8d6", w: 12, h: 15, open: false, covered: true },
  drawing: { label: "Drawing Room", color: "#e6f2d4", floor: "#b2c98a", w: 12, h: 14, open: false, covered: true },
  dining: { label: "Dining", color: "#f8e6c4", floor: "#d6bd86", w: 10, h: 12, open: false, covered: true },
  office: { label: "Office / Study", color: "#dde7f0", floor: "#a9b9c9", w: 10, h: 10, open: false, covered: true },
  prayer: { label: "Prayer Room", color: "#e9f3e2", floor: "#a8c79a", w: 6, h: 6, open: false, covered: true },
  store: { label: "Store", color: "#e6e6e6", floor: "#b8b8b8", w: 6, h: 6, open: false, covered: true },
  stairs: { label: "Stairs", color: "#f1f1f1", floor: "#c7c7c7", w: 4, h: 12, open: false, covered: true },
  garage: { label: "Garage", color: "#d9dbe0", floor: "#8e9199", w: 10, h: 18, open: false, covered: true },
  porch: { label: "Porch", color: "#efe1cf", floor: "#c9b79f", w: 10, h: 10, open: true, covered: true },
  lawn: { label: "Lawn", color: "#cfeab8", floor: "#6fae4b", w: 10, h: 15, open: true, covered: false },
  grass: { label: "Grass Area", color: "#bfe3a0", floor: "#5f9f3f", w: 10, h: 10, open: true, covered: false },
  footpath: { label: "Footpath", color: "#dcd8cf", floor: "#a9a59b", w: 4, h: 15, open: true, covered: false },
  plants: { label: "Plants / Planter", color: "#b7dc9c", floor: "#4f8f3a", w: 8, h: 3, open: true, covered: false },
  tree: { label: "Tree", color: "#c2e0a8", floor: "#3f7f32", w: 6, h: 6, open: true, covered: false },
  balcony: { label: "Balcony", color: "#e7efe0", floor: "#b9c7ac", w: 4, h: 10, open: true, covered: true },
  other: { label: "Room", color: "#eeeeee", floor: "#bdbdbd", w: 10, h: 10, open: false, covered: true },
};

export const ROOM_TYPE_ORDER: RoomType[] = [
  "bedroom", "bathroom", "kitchen", "lounge", "drawing", "dining", "office", "prayer", "store", "stairs", "garage", "porch", "lawn", "grass", "footpath", "plants", "tree", "balcony", "other",
];

export interface OpeningSpec {
  label: string;
  width: number;
  /** Height of the bottom edge above the floor, feet. */
  sill: number;
  height: number;
}

export const OPENING_SPECS: Record<OpeningKind, OpeningSpec> = {
  door: { label: "Door", width: 3, sill: 0, height: 7 },
  main_door: { label: "Main door", width: 4, sill: 0, height: 7.5 },
  window: { label: "Window", width: 4, sill: 3, height: 4 },
  ventilator: { label: "Ventilator", width: 2, sill: 6, height: 1.5 },
};

export const OPENING_KIND_ORDER: OpeningKind[] = ["door", "main_door", "window", "ventilator"];

/** Wall thickness in feet: 9 inch outer walls, 4.5 inch inner walls. */
export const WALL_OUTER = 0.75;
export const WALL_INNER = 0.4;
export const SLAB = 0.5;
/** Height of the ground floor above the ground (plinth), feet. */
export const PLINTH = 1.5;
export const PARAPET = 3;

export const DEFAULT_FLOOR_HEIGHT = 10;

/** Thickness of the boundary wall (9 inch) and its usual height. */
export const BOUNDARY_T = 0.75;
export const BOUNDARY_HEIGHT = 4.5;

export interface GateSpec {
  label: string;
  width: number;
  min: number;
  max: number;
}

export const GATE_SPECS: Record<GateKind, GateSpec> = {
  main: { label: "Main gate", width: 10, min: 6, max: 24 },
  small: { label: "Small gate", width: 3.5, min: 2.5, max: 6 },
};

/** A boundary wall on the front of the plot with a main gate (centred on `centre`
 *  feet from the left, or near the right end when not given). */
export function defaultBoundary(plotWidth: number, centre?: number): Boundary {
  const width = Math.min(GATE_SPECS.main.width, Math.max(GATE_SPECS.main.min, Math.round(plotWidth * 0.4 * 2) / 2));
  const wanted = centre !== undefined ? centre - width / 2 : plotWidth - width - 1.5;
  const gate: Gate = { id: newId("g"), kind: "main", side: "bottom", offset: Math.round(Math.min(Math.max(1.5, wanted), Math.max(1.5, plotWidth - width - 1.5)) * 2) / 2, width };
  return { walls: { top: false, bottom: true, left: false, right: false }, height: BOUNDARY_HEIGHT, gates: [gate] };
}

export interface PlotPreset {
  key: string;
  label: string;
  width: number;
  length: number;
}

export const PLOT_PRESETS: PlotPreset[] = [
  { key: "3m", label: "3 Marla - 20 x 34 ft", width: 20, length: 34 },
  { key: "5m", label: "5 Marla - 25 x 45 ft", width: 25, length: 45 },
  { key: "7m", label: "7 Marla - 30 x 52 ft", width: 30, length: 52 },
  { key: "10m", label: "10 Marla - 35 x 65 ft", width: 35, length: 65 },
  { key: "1k", label: "1 Kanal - 50 x 90 ft", width: 50, length: 90 },
  { key: "2k", label: "2 Kanal - 100 x 90 ft", width: 100, length: 90 },
];

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function floorName(index: number): string {
  return ["Ground Floor", "First Floor", "Second Floor", "Third Floor"][index] ?? `Floor ${index + 1}`;
}

export function emptyDesign(width: number, length: number, floors = 1, floorHeight = DEFAULT_FLOOR_HEIGHT): DesignData {
  return {
    version: 1,
    plot: { width, length },
    floorHeight,
    floors: Array.from({ length: Math.max(1, Math.min(4, floors)) }, (_, i) => ({ id: newId("f"), name: floorName(i), rooms: [] })),
    boundary: defaultBoundary(width),
  };
}

export function newRoom(type: RoomType, x: number, y: number, name?: string): Room {
  const spec = ROOM_SPECS[type];
  return { id: newId("r"), type, name: name ?? spec.label, x, y, w: spec.w, h: spec.h, openings: [] };
}

type OpeningSeed = [kind: OpeningKind, side: "top" | "bottom" | "left" | "right", offset: number, width?: number];

function seedRoom(type: RoomType, name: string, x: number, y: number, w: number, h: number, openings: OpeningSeed[] = []): Room {
  return {
    id: newId("r"),
    type,
    name,
    x,
    y,
    w,
    h,
    openings: openings.map(([kind, side, offset, width]) => ({ id: newId("o"), kind, side, offset, width: width ?? OPENING_SPECS[kind].width })),
  };
}

/** A starter ground floor for a 5 Marla (25 x 45 ft) plot. */
export function fiveMarlaTemplate(floors: number, floorHeight = DEFAULT_FLOOR_HEIGHT): DesignData {
  const design = emptyDesign(25, 45, floors, floorHeight);
  design.floors[0].rooms = [
    seedRoom("bedroom", "Bedroom 1", 0, 0, 13, 12, [["window", "left", 4], ["window", "top", 4]]),
    seedRoom("bathroom", "Bath 1", 13, 0, 5, 8, [["door", "left", 2.5], ["ventilator", "top", 1.5]]),
    seedRoom("store", "Store", 13, 8, 5, 4),
    seedRoom("kitchen", "Kitchen", 18, 0, 7, 12, [["window", "top", 1.5], ["window", "right", 4], ["door", "bottom", 2]]),
    seedRoom("bedroom", "Bedroom 2", 0, 12, 13, 12, [["window", "left", 4], ["door", "right", 4]]),
    seedRoom("stairs", "Stairs", 13, 12, 4, 12),
    seedRoom("dining", "Dining", 17, 12, 8, 12, [["window", "right", 4], ["door", "bottom", 2.5]]),
    seedRoom("lounge", "TV Lounge", 0, 24, 13, 13, [["door", "top", 4], ["door", "right", 5], ["main_door", "bottom", 4.5], ["window", "left", 5]]),
    seedRoom("drawing", "Drawing Room", 13, 24, 12, 13, [["window", "bottom", 4], ["window", "right", 4]]),
    seedRoom("porch", "Porch", 0, 37, 13, 8),
    seedRoom("lawn", "Lawn", 13, 37, 12, 8),
  ];
  return design;
}
