"use server";

import { revalidatePath } from "next/cache";
import { serviceService } from "@/services/serviceService";

function revalidateAll() {
  revalidatePath("/admin/services");
  revalidatePath("/");
}

export interface ServiceFormState {
  error?: string;
  success?: boolean;
}

export async function saveServiceAction(
  id: string | null,
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const icon = String(formData.get("icon") ?? "Home");
  if (!title) return { error: "Service title is required." };

  try {
    if (id) {
      const updated = await serviceService.update(id, { title, description, icon });
      if (!updated) return { error: "Service not found." };
    } else {
      const all = await serviceService.list();
      await serviceService.create({
        title,
        description,
        icon,
        enabled: true,
        order: all.length + 1,
      });
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save this service." };
  }

  revalidateAll();
  return { success: true };
}

export async function toggleServiceEnabledAction(id: string) {
  try {
    const service = await serviceService.getById(id);
    if (!service) return;
    await serviceService.update(id, { enabled: !service.enabled });
    revalidateAll();
  } catch (e) {
    console.error("toggleServiceEnabledAction failed:", e);
  }
}

export async function deleteServiceAction(id: string) {
  try {
    await serviceService.remove(id);
    revalidateAll();
  } catch (e) {
    console.error("deleteServiceAction failed:", e);
  }
}
