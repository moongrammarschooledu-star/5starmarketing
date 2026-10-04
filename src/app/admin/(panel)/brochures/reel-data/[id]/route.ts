import { NextResponse } from "next/server";
import { brochureService } from "@/services/brochureService";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { site } from "@/lib/site";
import { buildNarration, type NarrationLang } from "@/lib/narration";

interface Target {
  name: string;
  slug: string;
  location: string;
  description: string;
  propertyType?: string;
  purpose?: string;
  size?: string;
  price?: string;
  status?: string;
  projectStatus?: string;
  availablePropertyTypes?: string[];
  features?: string[];
  amenities?: string[];
  highlights?: string[];
}

/** Everything the browser needs to draw the reel video. Photos are sent as
 *  their original https URLs (not embedded) to keep the payload small. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "brochures")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await params;
  const langParam = new URL(request.url).searchParams.get("lang");
  const langOverride: NarrationLang | undefined = langParam === "en" || langParam === "ur" ? langParam : undefined;

  let data: Awaited<ReturnType<typeof brochureService.buildRenderData>>;
  try {
    data = await brochureService.buildRenderData(id);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load this brochure." }, { status: 404 });
  }

  const brochure = data.brochure;
  const t = data.target as Target;
  const isProperty = brochure.type === "property";

  let images: string[] = [];
  if (isProperty && brochure.propertyId) {
    images = (await propertyService.getById(brochure.propertyId))?.images ?? [];
  } else if (brochure.projectId) {
    const project = await projectService.getById(brochure.projectId);
    images = project && project.images.length > 0 ? project.images : project?.coverImage ? [project.coverImage] : [];
  }
  images = images.filter((u) => /^https?:\/\//.test(u)).slice(0, 6);

  const phones = [data.business.phone, site.phoneDisplay2].filter((p, i, a) => p && a.indexOf(p) === i);
  const narration = buildNarration({
    name: t.name,
    location: t.location,
    price: isProperty ? t.price : undefined,
    description: t.description,
    phones,
    langOverride,
  });

  const facts = isProperty
    ? [
        { label: "Type", value: t.propertyType ?? "" },
        { label: "Size", value: t.size ?? "" },
        { label: "Purpose", value: t.purpose ?? "" },
      ]
    : [
        { label: "Status", value: t.projectStatus ?? "" },
        { label: "Offering", value: (t.availablePropertyTypes ?? []).join(", ") },
      ];

  const featureList = isProperty ? [...(t.features ?? []), ...(t.amenities ?? [])] : (t.highlights ?? []);

  return NextResponse.json({
    slug: t.slug,
    title: t.name,
    location: t.location,
    badge: data.badge ?? "",
    demand: isProperty ? (t.price ?? "") : "",
    facts: facts.filter((f) => f.value),
    features: featureList.slice(0, 6),
    images,
    companyName: site.fullName,
    about: site.description,
    tagline: `${site.tagline} - ${site.taglineSecondary}`,
    director: `${site.directorTitle}: ${site.director}`,
    services: ["Buying & Selling", "Development", "Construction", "Rental Services"],
    phones,
    email: data.business.email,
    website: site.websiteUrl.replace(/^https?:\/\//, ""),
    qr: data.qrCodes.propertyUrl ?? "",
    narration,
  });
}
