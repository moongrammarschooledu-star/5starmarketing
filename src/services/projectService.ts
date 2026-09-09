import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Project, ProjectInput, ProjectStatus } from "@/lib/models/project";
import {
  resolveStorageImages,
  deleteStorageImages,
  resolveStorageDocuments,
  deleteStorageDocuments,
  type StoredDocument,
} from "./storage";

const BUCKET = "project-images";

const STATUS_TO_DB: Record<ProjectStatus, string> = {
  Upcoming: "upcoming",
  Ongoing: "ongoing",
  Completed: "completed",
};
const STATUS_FROM_DB: Record<string, ProjectStatus> = {
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  completed: "Completed",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToProject(row: any): Project {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    location: row.location,
    type: row.property_type,
    status: STATUS_FROM_DB[row.status] ?? "Upcoming",
    shortDescription: row.short_description ?? "",
    description: row.description ?? "",
    highlights: row.highlights ?? [],
    propertyTypes: row.property_types ?? [],
    paymentOptions: row.payment_options ?? [],
    mapsUrl: row.maps_url ?? undefined,
    coverImage: row.cover_image ?? undefined,
    whatsappNumber: row.whatsapp_number ?? undefined,
    documents: (row.documents ?? []) as StoredDocument[],
    images: row.images ?? [],
    published: row.published ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProjectToRow(input: Partial<ProjectInput>) {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.location !== undefined) row.location = input.location;
  if (input.type !== undefined) row.property_type = input.type;
  if (input.status !== undefined) row.status = STATUS_TO_DB[input.status];
  if (input.shortDescription !== undefined) row.short_description = input.shortDescription;
  if (input.description !== undefined) row.description = input.description;
  if (input.highlights !== undefined) row.highlights = input.highlights;
  if (input.propertyTypes !== undefined) row.property_types = input.propertyTypes;
  if (input.paymentOptions !== undefined) row.payment_options = input.paymentOptions;
  if (input.mapsUrl !== undefined) row.maps_url = input.mapsUrl || null;
  if (input.whatsappNumber !== undefined) row.whatsapp_number = input.whatsappNumber || null;
  if (input.images !== undefined) row.images = input.images;
  if (input.published !== undefined) row.published = input.published;
  return row;
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "project"
  );
}

export const projectService = {
  async list(): Promise<Project[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("projectService.list failed:", error);
      throw new Error("Could not load projects.");
    }
    return (data ?? []).map(mapRowToProject);
  },

  async listPublished(): Promise<Project[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("projectService.listPublished failed:", error);
      throw new Error("Could not load projects.");
    }
    return (data ?? []).map(mapRowToProject);
  },

  async getById(id: string): Promise<Project | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("projectService.getById failed:", error);
      throw new Error("Could not load this project.");
    }
    return data ? mapRowToProject(data) : undefined;
  },

  async getBySlug(slug: string): Promise<Project | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      console.error("projectService.getBySlug failed:", error);
      throw new Error("Could not load this project.");
    }
    return data ? mapRowToProject(data) : undefined;
  },

  async create(input: ProjectInput): Promise<Project> {
    const supabase = await createClient();
    const images = await resolveStorageImages(input.images, BUCKET);
    const coverImageResolved = input.coverImage
      ? (await resolveStorageImages([input.coverImage], BUCKET))[0]
      : images[0];
    const documents = await resolveStorageDocuments(input.documents ?? []);

    const base = slugify(input.name);
    let slug = base;
    let n = 1;
    while (true) {
      const { data } = await supabase.from("projects").select("id").eq("slug", slug).maybeSingle();
      if (!data) break;
      slug = `${base}-${++n}`;
    }

    const row = {
      ...mapProjectToRow(input),
      images,
      cover_image: coverImageResolved || null,
      documents,
      slug,
    };
    const { data, error } = await supabase.from("projects").insert(row).select("*").single();
    if (error) {
      console.error("projectService.create failed:", error);
      throw new Error("Could not create this project.");
    }
    return mapRowToProject(data);
  },

  async update(id: string, input: Partial<ProjectInput>): Promise<Project | undefined> {
    const supabase = await createClient();
    const patch = mapProjectToRow(input);
    if (input.images !== undefined) {
      patch.images = await resolveStorageImages(input.images, BUCKET);
    }
    if (input.coverImage !== undefined) {
      patch.cover_image = input.coverImage
        ? (await resolveStorageImages([input.coverImage], BUCKET))[0]
        : null;
    }
    if (input.documents !== undefined) {
      patch.documents = await resolveStorageDocuments(input.documents);
    }

    const { data, error } = await supabase
      .from("projects")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("projectService.update failed:", error);
      throw new Error("Could not update this project.");
    }
    return data ? mapRowToProject(data) : undefined;
  },

  async remove(id: string): Promise<boolean> {
    const supabase = await createClient();
    const existing = await this.getById(id);

    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      console.error("projectService.remove failed:", error);
      throw new Error("Could not delete this project.");
    }

    if (existing) {
      await deleteStorageImages(existing.images, BUCKET);
      if (existing.coverImage) await deleteStorageImages([existing.coverImage], BUCKET);
      await deleteStorageDocuments(existing.documents);
    }
    return true;
  },
};
