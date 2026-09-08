"use server";

import { revalidatePath } from "next/cache";
import { projectService } from "@/services/projectService";
import type { ProjectStatus } from "@/lib/models/project";

function revalidateAll() {
  revalidatePath("/admin/projects");
  revalidatePath("/");
}

export interface ProjectFormState {
  error?: string;
  success?: boolean;
}

function buildInput(formData: FormData) {
  const images = formData
    .getAll("images")
    .map((v) => String(v))
    .filter(Boolean);

  return {
    name: String(formData.get("name") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    type: String(formData.get("type") ?? "").trim(),
    status: String(formData.get("status")) as ProjectStatus,
    description: String(formData.get("description") ?? "").trim(),
    images: images.length
      ? images
      : ["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1200&auto=format&fit=crop"],
  };
}

export async function saveProjectAction(
  id: string | null,
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const input = buildInput(formData);
  if (!input.name) return { error: "Project name is required." };

  try {
    if (id) {
      const updated = await projectService.update(id, input);
      if (!updated) return { error: "Project not found." };
    } else {
      await projectService.create(input);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save this project." };
  }

  revalidateAll();
  return { success: true };
}

export async function deleteProjectAction(id: string) {
  try {
    await projectService.remove(id);
    revalidateAll();
  } catch (e) {
    console.error("deleteProjectAction failed:", e);
  }
}
