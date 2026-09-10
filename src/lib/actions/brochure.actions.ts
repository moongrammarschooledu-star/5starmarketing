"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { brochureService } from "@/services/brochureService";
import { activityService } from "@/services/activityService";
import type { BrochureSectionKey, BrochureType } from "@/lib/models/brochure";

export interface BrochureFormState {
  error?: string;
}

function revalidateAll(id?: string) {
  revalidatePath("/admin/brochures");
  if (id) revalidatePath(`/admin/brochures/preview/${id}`);
}

export async function createBrochureAction(_prevState: BrochureFormState, formData: FormData): Promise<BrochureFormState> {
  const type = String(formData.get("type")) as BrochureType;
  const targetId = String(formData.get("targetId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const sections = formData.getAll("sections").map((v) => String(v)) as BrochureSectionKey[];

  if (!targetId) return { error: "Please select a property or project." };
  if (!title) return { error: "Please enter a brochure title." };
  if (sections.length === 0) return { error: "Please select at least one section." };

  let brochure;
  try {
    brochure = await brochureService.create(type, targetId, title, sections);
    await activityService.log("Created Brochure", title, "brochure", brochure.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create this brochure." };
  }

  revalidateAll();
  redirect(`/admin/brochures/preview/${brochure.id}`);
}

export async function updateBrochureAction(id: string, title: string, sections: BrochureSectionKey[]) {
  await brochureService.update(id, title, sections);
  revalidateAll(id);
}

export async function generateBrochurePdfAction(id: string): Promise<{ ok: boolean; error?: string; url?: string }> {
  try {
    const url = await brochureService.generatePdf(id);
    await activityService.log("Generated Brochure PDF", id, "brochure", id);
    revalidateAll(id);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not generate the PDF." };
  }
}

export async function setBrochurePublicAction(id: string, isPublic: boolean) {
  await brochureService.setPublic(id, isPublic);
  await activityService.log(isPublic ? "Published Brochure" : "Unpublished Brochure", id, "brochure", id);
  revalidateAll(id);
}

export async function deleteBrochureAction(id: string) {
  await brochureService.remove(id);
  await activityService.log("Deleted Brochure", id, "brochure", id);
  revalidateAll();
}
