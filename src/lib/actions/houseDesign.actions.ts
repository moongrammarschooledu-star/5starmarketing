"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { houseDesignService, type HouseDesignMeta } from "@/services/houseDesignService";
import { activityService } from "@/services/activityService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { PLOT_PRESETS, emptyDesign, fiveMarlaTemplate, DEFAULT_FLOOR_HEIGHT } from "@/lib/house/catalog";
import { parseDesignData } from "@/lib/house/schema";

export interface NewDesignState {
  error?: string;
}

async function requireAccess(): Promise<string> {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "construction")) throw new Error("Not authorized.");
  return admin.id;
}

function text(formData: FormData, name: string, max: number): string {
  return String(formData.get(name) ?? "").trim().slice(0, max);
}

function readMeta(formData: FormData): { meta?: HouseDesignMeta; error?: string } {
  const name = text(formData, "name", 120);
  if (!name) return { error: "Please give the design a name." };
  return {
    meta: {
      name,
      clientName: text(formData, "clientName", 120) || undefined,
      notes: text(formData, "notes", 2000) || undefined,
      constructionProjectId: text(formData, "constructionProjectId", 60) || undefined,
    },
  };
}

/** Creates a design from the "new design" form and opens the editor. */
export async function createHouseDesignAction(_prev: NewDesignState, formData: FormData): Promise<NewDesignState> {
  let id: string;
  try {
    const adminId = await requireAccess();
    const { meta, error } = readMeta(formData);
    if (!meta) return { error };

    const presetKey = text(formData, "plot", 20);
    const preset = PLOT_PRESETS.find((p) => p.key === presetKey);
    const width = preset ? preset.width : Number(text(formData, "customWidth", 10));
    const length = preset ? preset.length : Number(text(formData, "customLength", 10));
    if (!Number.isFinite(width) || !Number.isFinite(length) || width < 10 || length < 10 || width > 400 || length > 400) {
      return { error: "Enter the plot width and length in feet (between 10 and 400)." };
    }
    const floors = Math.round(Number(text(formData, "floors", 2)) || 1);
    if (floors < 1 || floors > 4) return { error: "Floors must be between 1 and 4." };
    const floorHeight = Number(text(formData, "floorHeight", 5)) || DEFAULT_FLOOR_HEIGHT;
    if (floorHeight < 8 || floorHeight > 16) return { error: "Floor height must be between 8 and 16 feet." };

    const template = text(formData, "template", 20);
    const data =
      template === "5marla" && width === 25 && length === 45 ? fiveMarlaTemplate(floors, floorHeight) : emptyDesign(width, length, floors, floorHeight);

    const design = await houseDesignService.create(meta, data, adminId);
    id = design.id;
    await activityService.log("Created House Design", design.name, "house_design", design.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create the design." };
  }
  revalidatePath("/admin/house-designer");
  redirect(`/admin/house-designer/${id}`);
}

export interface SaveDesignInput {
  name: string;
  clientName: string;
  notes: string;
  constructionProjectId: string;
  data: unknown;
}

/** Saves the editor's current drawing. */
export async function saveHouseDesignAction(id: string, input: SaveDesignInput): Promise<{ ok: boolean; error?: string; savedAt?: string }> {
  try {
    await requireAccess();
    const name = input.name.trim().slice(0, 120);
    if (!name) return { ok: false, error: "Please give the design a name." };
    const parsed = parseDesignData(input.data);
    if (!parsed.data) return { ok: false, error: parsed.error };
    const meta: HouseDesignMeta = {
      name,
      clientName: input.clientName.trim().slice(0, 120) || undefined,
      notes: input.notes.trim().slice(0, 2000) || undefined,
      constructionProjectId: input.constructionProjectId.trim().slice(0, 60) || undefined,
    };
    const design = await houseDesignService.update(id, meta, parsed.data);
    if (!design) return { ok: false, error: "This design no longer exists." };
    revalidatePath("/admin/house-designer");
    return { ok: true, savedAt: design.updatedAt };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the design." };
  }
}

export async function duplicateHouseDesignAction(id: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const adminId = await requireAccess();
    const source = await houseDesignService.getById(id);
    if (!source) return { ok: false, error: "This design no longer exists." };
    const copy = await houseDesignService.create(
      { name: `${source.name} (copy)`.slice(0, 120), clientName: source.clientName, notes: source.notes, constructionProjectId: source.constructionProjectId },
      source.data,
      adminId
    );
    await activityService.log("Copied House Design", copy.name, "house_design", copy.id);
    revalidatePath("/admin/house-designer");
    return { ok: true, id: copy.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not copy the design." };
  }
}

export async function deleteHouseDesignAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAccess();
    const existing = await houseDesignService.getById(id);
    await houseDesignService.remove(id);
    if (existing) await activityService.log("Deleted House Design", existing.name, "house_design", id);
    revalidatePath("/admin/house-designer");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete the design." };
  }
}
