import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { propertyService } from "./propertyService";
import { projectService } from "./projectService";
import { paymentPlanService } from "./paymentPlanService";
import { settingsService } from "./settingsService";
import { profileService } from "./profileService";
import { generateQrCodeDataUrl } from "@/lib/qrcode";
import { calculatePaymentPlan } from "@/lib/calculator";
import { site, whatsappUrlFor } from "@/lib/site";
import { BrochureDocument } from "@/lib/pdf/BrochureDocument";
import type { Brochure, BrochureSummary, BrochureSectionKey, BrochureType } from "@/lib/models/brochure";

const BUCKET = "brochures";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Brochure {
  return {
    id: row.id,
    propertyId: row.property_id ?? undefined,
    projectId: row.project_id ?? undefined,
    type: row.type,
    title: row.title,
    slug: row.slug,
    selectedSections: row.selected_sections ?? [],
    generatedFile: row.generated_file ?? undefined,
    public: row.public,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "brochure"
  );
}

/** Filenames must be safe for every OS/browser — strip anything but
 *  letters, digits and hyphens (STEP 13 section 17). */
function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
}

export const brochureService = {
  async list(): Promise<BrochureSummary[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("brochures").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("brochureService.list failed:", error);
      throw new Error("Could not load brochures.");
    }
    const rows = (data ?? []).map(mapRow);

    const propertyIds = rows.filter((r) => r.propertyId).map((r) => r.propertyId as string);
    const projectIds = rows.filter((r) => r.projectId).map((r) => r.projectId as string);
    const [properties, projects] = await Promise.all([
      propertyIds.length > 0 ? propertyService.list() : Promise.resolve([]),
      projectIds.length > 0 ? projectService.list() : Promise.resolve([]),
    ]);
    const propertyMap = new Map(properties.map((p) => [p.id, p]));
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    return rows.map((r) => {
      const target = r.propertyId ? propertyMap.get(r.propertyId) : projectMap.get(r.projectId as string);
      return {
        ...r,
        targetName: target ? ("title" in target ? target.title : target.name) : "(deleted)",
        targetSlug: target?.slug ?? "",
      };
    });
  },

  async getById(id: string): Promise<Brochure | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("brochures").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async getBySlugPublic(slug: string): Promise<Brochure | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("brochures").select("*").eq("slug", slug).eq("public", true).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  /** Property/project detail page CTA (STEP 13 sections 23/24) — only
   *  ever returns a brochure that is both public AND already has a
   *  generated file, so the button never links to nothing. */
  async getActivePublicForProperty(propertyId: string): Promise<Brochure | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("brochures")
      .select("*")
      .eq("property_id", propertyId)
      .eq("public", true)
      .not("generated_file", "is", null)
      .maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async getActivePublicForProject(projectId: string): Promise<Brochure | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("brochures")
      .select("*")
      .eq("project_id", projectId)
      .eq("public", true)
      .not("generated_file", "is", null)
      .maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(type: BrochureType, targetId: string, title: string, selectedSections: BrochureSectionKey[]): Promise<Brochure> {
    const target = type === "property" ? await propertyService.getById(targetId) : await projectService.getById(targetId);
    if (!target) throw new Error("Could not find the selected property or project.");
    const targetSlug = target.slug;

    const supabase = await createClient();
    const base = slugify(`${targetSlug}-brochure`);
    let slug = base;
    let n = 1;
    while (true) {
      const { data } = await supabase.from("brochures").select("id").eq("slug", slug).maybeSingle();
      if (!data) break;
      slug = `${base}-${++n}`;
    }

    const admin = await profileService.getCurrentAdmin();
    const row = {
      property_id: type === "property" ? targetId : null,
      project_id: type === "project" ? targetId : null,
      type,
      title,
      slug,
      selected_sections: selectedSections,
      created_by: admin?.id ?? null,
    };
    const { data, error } = await supabase.from("brochures").insert(row).select("*").single();
    if (error) {
      console.error("brochureService.create failed:", error);
      throw new Error("Could not create this brochure.");
    }
    return mapRow(data);
  },

  async update(id: string, title: string, selectedSections: BrochureSectionKey[]): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("brochures").update({ title, selected_sections: selectedSections }).eq("id", id);
    if (error) throw new Error("Could not update this brochure.");
  },

  async setPublic(id: string, isPublic: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("brochures").update({ public: isPublic }).eq("id", id);
    if (error) throw new Error("Could not update this brochure.");
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const existing = await this.getById(id);
    const { error } = await supabase.from("brochures").delete().eq("id", id);
    if (error) throw new Error("Could not delete this brochure.");
    if (existing?.generatedFile) {
      const path = existing.generatedFile.split(`/${BUCKET}/`)[1];
      if (path) await supabase.storage.from(BUCKET).remove([path]);
    }
  },

  /** Gathers everything BrochureDocument needs to render, straight from
   *  the database — shared by the real PDF generation and the live
   *  admin preview so they can never drift apart. */
  async buildRenderData(id: string) {
    const brochure = await this.getById(id);
    if (!brochure) throw new Error("Brochure not found.");

    const settings = await settingsService.get().catch(() => null);
    const businessName = settings?.businessName?.replace(/ Estate.*/i, "").trim() || site.name;
    const whatsappNumber = settings?.whatsapp || site.whatsappNumber;
    const business = {
      name: businessName,
      address: settings?.address || site.address,
      phone: settings?.phone || site.phoneDisplay,
      email: settings?.email || site.email,
      whatsappNumber,
      whatsappUrl: whatsappUrlFor(whatsappNumber),
    };

    let target: Awaited<ReturnType<typeof buildPropertyTarget>> | Awaited<ReturnType<typeof buildProjectTarget>>;
    let badge: string | undefined;
    let paymentPlanInfo: Awaited<ReturnType<typeof buildPaymentPlan>> | undefined;

    if (brochure.type === "property") {
      const property = await propertyService.getById(brochure.propertyId as string);
      if (!property) throw new Error("The property for this brochure could not be found.");
      target = await buildPropertyTarget(property);
      badge = property.purpose === "For Sale" ? "FOR SALE" : property.purpose === "Investment" ? "INVESTMENT OPPORTUNITY" : undefined;
      const plan = await paymentPlanService.getForPropertyAdmin(property.id);
      if (plan) paymentPlanInfo = buildPaymentPlan(plan, await paymentPlanService.listScheduleItems(plan.id));
    } else {
      const project = await projectService.getById(brochure.projectId as string);
      if (!project) throw new Error("The project for this brochure could not be found.");
      target = await buildProjectTarget(project);
      badge = "PROJECT";
    }

    const [whatsappQr, propertyUrlQr, mapsQr] = await Promise.all([
      generateQrCodeDataUrl(
        whatsappUrlFor(
          settings?.whatsapp || site.whatsappNumber,
          `Assalam-o-Alaikum, I am interested in ${target.name}. Please share complete details.`
        )
      ),
      generateQrCodeDataUrl(target.publicUrl),
      target.directionsUrl ? generateQrCodeDataUrl(target.directionsUrl) : Promise.resolve(undefined),
    ]);

    return {
      brochure,
      business,
      target,
      paymentPlanInfo,
      badge,
      qrCodes: { whatsapp: whatsappQr, propertyUrl: propertyUrlQr, maps: mapsQr },
    };
  },

  /** The core of STEP 13 — builds the actual PDF from real database
   *  records only (never invented figures) and uploads it to Supabase
   *  Storage, then records the public file URL on the brochure row. */
  async generatePdf(id: string): Promise<string> {
    const { brochure, business, target, paymentPlanInfo, badge, qrCodes } = await this.buildRenderData(id);

    const buffer = await renderToBuffer(
      <BrochureDocument
        type={brochure.type}
        sections={brochure.selectedSections}
        business={business}
        target={target}
        paymentPlan={paymentPlanInfo}
        qrCodes={qrCodes}
        badge={badge}
      />
    );

    const supabase = await createClient();
    const filename = `${sanitizeFilename(`5STAR-M-${target.slug}-brochure`)}.pdf`;
    const path = `${brochure.id}/${filename}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (uploadError) {
      console.error("brochureService.generatePdf upload failed:", uploadError);
      throw new Error("Could not generate the PDF. Please try again.");
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const { error: updateError } = await supabase.from("brochures").update({ generated_file: publicUrlData.publicUrl }).eq("id", id);
    if (updateError) {
      console.error("brochureService.generatePdf update failed:", updateError);
      throw new Error("The PDF was generated but could not be saved. Please try again.");
    }

    return publicUrlData.publicUrl;
  },
};

async function buildPropertyTarget(property: Awaited<ReturnType<typeof propertyService.getById>>) {
  if (!property) throw new Error("Property not found.");
  const publicUrl = `${site.url}/properties/${property.slug}`;
  const directionsUrl = property.mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.mapsQuery)}`
    : undefined;
  return {
    name: property.title,
    slug: property.slug,
    location: property.location,
    images: property.images,
    description: property.description,
    publicUrl,
    mapsQuery: property.mapsQuery,
    directionsUrl,
    propertyType: property.type,
    purpose: property.purpose,
    size: property.size,
    price: property.price,
    status: property.status,
    features: property.features,
    amenities: property.amenities,
  };
}

async function buildProjectTarget(project: Awaited<ReturnType<typeof projectService.getById>>) {
  if (!project) throw new Error("Project not found.");
  const publicUrl = `${site.url}/projects/${project.slug}`;
  const directionsUrl = project.mapsUrl
    ? project.mapsUrl
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.location)}`;
  return {
    name: project.name,
    slug: project.slug,
    location: project.location,
    images: project.images.length > 0 ? project.images : project.coverImage ? [project.coverImage] : [],
    description: project.description || project.shortDescription,
    publicUrl,
    mapsQuery: project.location,
    directionsUrl,
    projectStatus: project.status,
    highlights: project.highlights,
    availablePropertyTypes: project.propertyTypes,
    paymentOptionsList: project.paymentOptions,
  };
}

function buildPaymentPlan(
  plan: Awaited<ReturnType<typeof paymentPlanService.getForPropertyAdmin>>,
  scheduleItems: Awaited<ReturnType<typeof paymentPlanService.listScheduleItems>>
) {
  if (!plan) return undefined;
  const remaining = plan.propertyPrice - plan.downPayment;
  let installmentAmount = plan.installmentAmount;
  if (plan.calculationType === "Automatic") {
    installmentAmount = calculatePaymentPlan({
      propertyPrice: plan.propertyPrice,
      downPayment: plan.downPayment,
      duration: plan.duration,
      frequency: plan.installmentFrequency,
    }).installmentAmount;
  }
  return {
    propertyPrice: plan.propertyPrice,
    downPayment: plan.downPayment,
    remainingAmount: remaining,
    installmentAmount,
    frequency: plan.installmentFrequency,
    duration: plan.duration,
    scheduleItems: scheduleItems.map((item) => ({
      installmentNumber: item.installmentNumber,
      dueDate: item.dueDate,
      amount: `Rs. ${Math.round(item.amount).toLocaleString("en-US")}`,
      description: item.description,
    })),
  };
}
