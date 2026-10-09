import { NextResponse } from "next/server";
import { z } from "zod";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { isRateLimited } from "@/lib/rateLimit";
import { floorName } from "@/lib/house/catalog";
import { designWarnings } from "@/lib/house/geometry";
import { buildDesignFromTrace, type TraceFloor } from "@/lib/house/trace";
import { readPlanPicture } from "@/lib/house/traceAi";

// Reading a picture takes the AI a while (and costs money): admin-only, rate
// limited, and the pictures are only passed on, never stored.
export const maxDuration = 60;

const bodySchema = z.object({
  plot: z.object({ width: z.number().min(10).max(400), length: z.number().min(10).max(400) }),
  floors: z.number().int().min(1).max(4),
  floorHeight: z.number().min(8).max(16).optional(),
  images: z
    .array(z.object({ mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().min(100).max(3_400_000) }))
    .min(1)
    .max(3),
});

export async function POST(request: Request) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "construction")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  if (isRateLimited(`house-trace:${admin.id}`, 3_600_000, 15)) {
    return NextResponse.json({ error: "Too many pictures were read in the last hour. Please wait a little." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The pictures could not be read. Please choose JPG or PNG pictures and try again." }, { status: 400 });
  const { plot, floors, images, floorHeight } = parsed.data;

  const results = await Promise.all(images.map((img, i) => readPlanPicture(img, plot, floorName(i))));
  const failed = results.findIndex((r) => !r.ok);
  if (failed >= 0) {
    const r = results[failed];
    const message = !r.ok ? r.message : "";
    return NextResponse.json({ error: images.length > 1 ? `${floorName(failed)}: ${message}` : message }, { status: !r.ok && r.notConfigured ? 501 : 502 });
  }

  const traceFloors: TraceFloor[] = results.map((r, i) => ({ name: floorName(i), trace: (r as { ok: true; trace: TraceFloor["trace"] }).trace }));
  const { design, notes } = buildDesignFromTrace(traceFloors, plot, floors, floorHeight);
  return NextResponse.json({ design, notes, warnings: designWarnings(design) });
}
