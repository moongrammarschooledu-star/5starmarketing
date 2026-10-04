import { NextResponse } from "next/server";
import { brochureService } from "@/services/brochureService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { renderFacebookPostImage } from "@/lib/facebookPostImage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "brochures")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await params;
  let data: Awaited<ReturnType<typeof brochureService.buildRenderData>>;
  try {
    data = await brochureService.buildRenderData(id);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load this brochure." }, { status: 404 });
  }

  return renderFacebookPostImage(data, Boolean(new URL(request.url).searchParams.get("download")));
}
