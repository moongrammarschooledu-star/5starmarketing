"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { projectService } from "@/services/projectService";
import { activityService } from "@/services/activityService";
import type { ProjectStatus } from "@/lib/models/project";

function revalidateAll(slug?: string) {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  revalidatePath("/");
  if (slug) revalidatePath(`/projects/${slug}`);
}

function errorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function linesToList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildDocumentsFromForm(formData: FormData) {
  return formData
    .getAll("documents")
    .map((v) => {
      try {
        const parsed = JSON.parse(String(v));
        return { name: String(parsed.name ?? ""), url: String(parsed.url ?? "") };
      } catch {
        return null;
      }
    })
    .filter((d): d is { name: string; url: string } => !!d && !!d.name && !!d.url);
}

function buildInputFromForm(formData: FormData, publish: boolean) {
  const images = formData
    .getAll("images")
    .map((v) => String(v))
    .filter(Boolean);
  const coverImage = String(formData.get("coverImage") ?? "").trim();

  return {
    name: String(formData.get("name") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    type: String(formData.get("type") ?? "").trim() || "Residential",
    status: String(formData.get("status")) as ProjectStatus,
    shortDescription: String(formData.get("shortDescription") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    highlights: linesToList(formData.get("highlights")),
    propertyTypes: linesToList(formData.get("propertyTypes")),
    paymentOptions: linesToList(formData.get("paymentOptions")),
    mapsUrl: String(formData.get("mapsUrl") ?? "").trim() || undefined,
    whatsappNumber: String(formData.get("whatsappNumber") ?? "").trim() || undefined,
    coverImage: coverImage || (images[0] ?? undefined),
    documents: buildDocumentsFromForm(formData),
    images: images.length
      ? images
      : ["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1200&auto=format&fit=crop"],
    published: publish,
  };
}

export interface ProjectFormState {
  error?: string;
}

export async function createProjectAction(
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const publish = String(formData.get("intent") ?? "") === "publish";
  const input = buildInputFromForm(formData, publish);
  if (!input.name) return { error: "Project name is required." };

  let project;
  try {
    project = await projectService.create(input);
  } catch (e) {
    return { error: errorMessage(e, "Could not create this project. Please try again.") };
  }

  await activityService.log("Added Project", project.name, "project", project.id);
  revalidateAll(project.slug);
  redirect("/admin/projects");
}

export async function updateProjectAction(
  id: string,
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const intent = String(formData.get("intent") ?? "");
  const existing = await projectService.getById(id);
  // "Save Project" keeps the current published state; "Save & Publish"
  // forces it on. There's no UI path to un-publish here by design — that
  // happens via the status/visibility the admin manages explicitly.
  const publish = intent === "publish" ? true : (existing?.published ?? false);
  const input = buildInputFromForm(formData, publish);
  if (!input.name) return { error: "Project name is required." };

  let updated;
  try {
    updated = await projectService.update(id, input);
  } catch (e) {
    return { error: errorMessage(e, "Could not update this project. Please try again.") };
  }
  if (!updated) return { error: "Project not found." };

  await activityService.log("Updated Project", updated.name, "project", updated.id);
  revalidateAll(updated.slug);
  redirect("/admin/projects");
}

export async function deleteProjectAction(id: string) {
  try {
    const existing = await projectService.getById(id);
    await projectService.remove(id);
    if (existing) await activityService.log("Deleted Project", existing.name, "project", id);
    revalidateAll();
  } catch (e) {
    console.error("deleteProjectAction failed:", e);
  }
}

export async function toggleProjectPublishedAction(id: string) {
  try {
    const project = await projectService.getById(id);
    if (!project) return;
    await projectService.update(id, { published: !project.published });
    revalidateAll(project.slug);
  } catch (e) {
    console.error("toggleProjectPublishedAction failed:", e);
  }
}
