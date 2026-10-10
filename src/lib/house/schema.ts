import { z } from "zod";
import { OPENING_KIND_ORDER, ROOM_TYPE_ORDER } from "./catalog";
import type { DesignData } from "./types";

const id = z.string().min(1).max(60);

const opening = z.object({
  id,
  kind: z.enum(OPENING_KIND_ORDER as [string, ...string[]]),
  side: z.enum(["top", "bottom", "left", "right"]),
  offset: z.number().min(-1).max(500),
  width: z.number().min(0.5).max(40),
});

const room = z.object({
  id,
  type: z.enum(ROOM_TYPE_ORDER as [string, ...string[]]),
  name: z.string().max(40),
  x: z.number().min(-50).max(600),
  y: z.number().min(-50).max(600),
  w: z.number().min(1).max(600),
  h: z.number().min(1).max(600),
  openings: z.array(opening).max(16),
});

const floor = z.object({ id, name: z.string().max(40), rooms: z.array(room).max(60) });

const boundarySchema = z.object({
  walls: z.object({ top: z.boolean(), bottom: z.boolean(), left: z.boolean(), right: z.boolean() }),
  height: z.number().min(2).max(10),
  gates: z
    .array(z.object({ id, kind: z.enum(["main", "small"]), side: z.enum(["top", "bottom", "left", "right"]), offset: z.number().min(0).max(500), width: z.number().min(2).max(30) }))
    .max(10),
});

export const designDataSchema = z.object({
  version: z.literal(1),
  plot: z.object({ width: z.number().min(10).max(400), length: z.number().min(10).max(400) }),
  floorHeight: z.number().min(8).max(16),
  floors: z.array(floor).min(1).max(4),
  boundary: boundarySchema.optional(),
});

export const autoCountsSchema = z.object({
  bedrooms: z.number().int().min(0).max(8),
  bathrooms: z.number().int().min(0).max(10),
  kitchens: z.number().int().min(0).max(2),
  lounges: z.number().int().min(0).max(2),
  stores: z.number().int().min(0).max(3),
  drawing: z.boolean(),
  dining: z.boolean(),
  prayer: z.boolean(),
  study: z.boolean(),
  porch: z.boolean(),
  lawn: z.boolean(),
  garage: z.boolean(),
});

/** Checks drawing data coming from the browser before it is stored. */
export function parseDesignData(raw: unknown): { data?: DesignData; error?: string } {
  const result = designDataSchema.safeParse(raw);
  if (!result.success) return { error: "The drawing data is not valid. Please reload the page and try again." };
  return { data: result.data as DesignData };
}
