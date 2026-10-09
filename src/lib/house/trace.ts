import { z } from "zod";
import { DEFAULT_FLOOR_HEIGHT, OPENING_KIND_ORDER, OPENING_SPECS, ROOM_TYPE_ORDER, emptyDesign, newId } from "./catalog";
import type { DesignData, Opening, OpeningKind, Room, RoomType, Side } from "./types";

// A hand-drawn naqsha is read by an AI model, which answers with rooms in feet.
// Whatever it answers is untrusted: this file validates it, snaps it to
// 6 inches, keeps it inside the plot and turns it into a normal DesignData.

const num = z.number().finite();

// Strings are not length-limited here: an over-long label from the model is
// shortened later instead of making the whole plan fail.
const rawOpening = z.object({
  kind: z.string(),
  side: z.string(),
  offset: num,
  width: num.optional(),
});

const rawRoom = z.object({
  type: z.string(),
  name: z.string().optional(),
  x: num,
  y: num,
  w: num,
  h: num,
  openings: z.array(rawOpening).max(20).optional(),
});

export const rawTraceSchema = z.object({
  rooms: z.array(rawRoom).max(60),
  notes: z.array(z.string()).max(40).optional(),
});

export type RawTrace = z.infer<typeof rawTraceSchema>;

const SYNONYMS: Record<string, RoomType> = {
  bed: "bedroom",
  "bed room": "bedroom",
  master: "bedroom",
  bath: "bathroom",
  toilet: "bathroom",
  washroom: "bathroom",
  wc: "bathroom",
  tv: "lounge",
  "tv lounge": "lounge",
  hall: "lounge",
  living: "lounge",
  "drawing room": "drawing",
  guest: "drawing",
  study: "office",
  "prayer room": "prayer",
  namaz: "prayer",
  stair: "stairs",
  staircase: "stairs",
  car: "garage",
  parking: "garage",
  terrace: "balcony",
  garden: "lawn",
};

/** Words that give a room type away, checked in this order ("attached bath" must not become a bedroom). */
const KEYWORDS: [string, RoomType][] = [
  ["bath", "bathroom"],
  ["toilet", "bathroom"],
  ["wash", "bathroom"],
  ["kitchen", "kitchen"],
  ["bed", "bedroom"],
  ["master", "bedroom"],
  ["drawing", "drawing"],
  ["guest", "drawing"],
  ["dining", "dining"],
  ["lounge", "lounge"],
  ["hall", "lounge"],
  ["tv", "lounge"],
  ["study", "office"],
  ["office", "office"],
  ["pray", "prayer"],
  ["namaz", "prayer"],
  ["store", "store"],
  ["stair", "stairs"],
  ["garage", "garage"],
  ["parking", "garage"],
  ["porch", "porch"],
  ["lawn", "lawn"],
  ["garden", "lawn"],
  ["balcon", "balcony"],
  ["terrace", "balcony"],
];

function toRoomType(raw: string, label = ""): RoomType {
  const t = raw.trim().toLowerCase();
  if ((ROOM_TYPE_ORDER as string[]).includes(t)) return t as RoomType;
  if (SYNONYMS[t]) return SYNONYMS[t];
  const hay = `${t} ${label.toLowerCase()}`;
  return KEYWORDS.find(([k]) => hay.includes(k))?.[1] ?? "other";
}

function toOpeningKind(raw: string): OpeningKind {
  const t = raw.trim().toLowerCase();
  if ((OPENING_KIND_ORDER as string[]).includes(t)) return t as OpeningKind;
  if (t.includes("main") || t.includes("gate")) return "main_door";
  if (t.includes("vent")) return "ventilator";
  if (t.includes("door")) return "door";
  return "window";
}

const half = (n: number) => Math.round(n * 2) / 2;
const quarter = (n: number) => Math.round(n * 4) / 4;

export interface TraceFloor {
  name: string;
  trace: RawTrace;
}

export interface TraceResult {
  design: DesignData;
  notes: string[];
}

/** Parses the model's text answer (JSON, possibly with stray words around it). */
export function parseTraceAnswer(text: string): { trace?: RawTrace; error?: string } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { error: "The AI did not return a plan." };
  let json: unknown;
  try {
    json = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { error: "The AI answer could not be read." };
  }
  if (json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string") {
    return { error: (json as { error: string }).error.slice(0, 300) };
  }
  const parsed = rawTraceSchema.safeParse(json);
  if (!parsed.success) return { error: "The AI answer was not a valid plan." };
  if (parsed.data.rooms.length === 0) return { error: "No rooms were found in the picture." };
  return { trace: parsed.data };
}

/** Turns the raw rooms of each floor into a clean design for this plot. */
export function buildDesignFromTrace(floors: TraceFloor[], plot: { width: number; length: number }, totalFloors: number, floorHeight = DEFAULT_FLOOR_HEIGHT): TraceResult {
  const design = emptyDesign(plot.width, plot.length, Math.max(totalFloors, floors.length), floorHeight);
  const notes: string[] = [];

  floors.forEach((tf, fi) => {
    const rooms = tf.trace.rooms;
    // The picture's drawing can be bigger than the plot: shrink it all together.
    const maxX = Math.max(...rooms.map((r) => r.x + r.w), 1);
    const maxY = Math.max(...rooms.map((r) => r.y + r.h), 1);
    const scale = Math.min(1, plot.width / maxX, plot.length / maxY);
    if (scale < 0.98) notes.push(`${design.floors[fi].name}: the drawing was larger than the plot, so it was shrunk to ${Math.round(scale * 100)}%.`);

    const out: Room[] = [];
    for (const r of rooms) {
      const x = Math.max(0, half(r.x * scale));
      const y = Math.max(0, half(r.y * scale));
      const w = Math.max(2.5, half(r.w * scale));
      const h = Math.max(2.5, half(r.h * scale));
      const type = toRoomType(r.type, r.name ?? "");
      const room: Room = {
        id: newId("r"),
        type,
        name: (r.name ?? "").trim().slice(0, 40) || type,
        x: Math.min(x, Math.max(0, plot.width - 2.5)),
        y: Math.min(y, Math.max(0, plot.length - 2.5)),
        w: 0,
        h: 0,
        openings: [],
      };
      room.w = Math.min(w, plot.width - room.x);
      room.h = Math.min(h, plot.length - room.y);

      for (const o of r.openings ?? []) {
        const side = (["top", "bottom", "left", "right"] as const).find((s) => s === o.side.trim().toLowerCase()) as Side | undefined;
        if (!side) continue;
        const kind = toOpeningKind(o.kind);
        const edge = side === "top" || side === "bottom" ? room.w : room.h;
        const width = Math.min(quarter(o.width && o.width > 0 ? o.width : OPENING_SPECS[kind].width), Math.max(1.5, edge - 0.5));
        if (width < 1 || edge < width + 0.5) continue;
        const offset = Math.min(Math.max(0, quarter(o.offset)), edge - width);
        room.openings.push({ id: newId("o"), kind, side, offset, width } as Opening);
      }
      out.push(room);
    }
    design.floors[fi].rooms = out;
  });

  for (const n of floors.flatMap((f, i) => (f.trace.notes ?? []).slice(0, 12).map((t) => `${design.floors[i].name}: ${t.slice(0, 300)}`))) notes.push(n);
  return { design, notes };
}
