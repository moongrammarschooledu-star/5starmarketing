// House designer: a house is described in FEET on a plan where x runs left
// to right and y runs top to bottom. The FRONT of the house (the road side)
// is the bottom of the plan (largest y).

export type Side = "top" | "bottom" | "left" | "right";

export type RoomType =
  | "bedroom"
  | "bathroom"
  | "kitchen"
  | "lounge"
  | "drawing"
  | "dining"
  | "office"
  | "prayer"
  | "store"
  | "stairs"
  | "garage"
  | "porch"
  | "lawn"
  | "grass"
  | "footpath"
  | "plants"
  | "tree"
  | "balcony"
  | "other";

export type OpeningKind = "door" | "main_door" | "window" | "ventilator";

export interface Opening {
  id: string;
  kind: OpeningKind;
  side: Side;
  /** Feet from the start of that side (left end of top/bottom, top end of left/right). */
  offset: number;
  width: number;
}

export interface Room {
  id: string;
  type: RoomType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  openings: Opening[];
}

export interface Floor {
  id: string;
  name: string;
  rooms: Room[];
}

/** A gate in the boundary wall: the big main gate (for the car) or a small walking gate. */
export type GateKind = "main" | "small";

export interface Gate {
  id: string;
  kind: GateKind;
  /** Which boundary wall it is in. */
  side: Side;
  /** Feet from the start of that wall (left end of front/back, top end of left/right). */
  offset: number;
  width: number;
}

/** The wall around the plot: which sides have a wall, how high, and the gates. */
export interface Boundary {
  walls: Record<Side, boolean>;
  height: number;
  gates: Gate[];
}

export interface DesignData {
  version: 1;
  plot: { width: number; length: number };
  /** Clear height of every storey, floor to ceiling, in feet. */
  floorHeight: number;
  floors: Floor[];
  /** The boundary wall and gates. Old designs do not have it. */
  boundary?: Boundary;
}

export type ViewName = "front" | "back" | "left" | "right";

export interface HouseDesign {
  id: string;
  name: string;
  clientName?: string;
  notes?: string;
  constructionProjectId?: string;
  constructionProjectName?: string;
  data: DesignData;
  createdAt: string;
  updatedAt: string;
}
