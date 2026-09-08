"use server";

import { revalidatePath } from "next/cache";
import { servicesRepository } from "@/lib/repositories/services.repository";

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

  if (id) {
    const updated = await servicesRepository.update(id, { title, description, icon });
    if (!updated) return { error: "Service not found." };
  } else {
    const all = await servicesRepository.list();
    await servicesRepository.create({
      title,
      description,
      icon,
      enabled: true,
      order: all.length + 1,
    });
  }

  revalidateAll();
  return { success: true };
}

export async function toggleServiceEnabledAction(id: string) {
  const service = await servicesRepository.getById(id);
  if (!service) return;
  await servicesRepository.update(id, { enabled: !service.enabled });
  revalidateAll();
}

export async function deleteServiceAction(id: string) {
  await servicesRepository.remove(id);
  revalidateAll();
}
