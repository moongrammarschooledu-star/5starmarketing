"use server";

import { revalidatePath } from "next/cache";
import { whatsappService } from "@/services/whatsappService";
import { profileService } from "@/services/profileService";
import type { WhatsAppActivityAction } from "@/lib/models/whatsapp";

function revalidateAll(leadId?: string) {
  revalidatePath("/admin/whatsapp");
  revalidatePath("/admin/leads");
  if (leadId) revalidatePath(`/admin/leads/${leadId}`);
}

/** Called right before opening a wa.me link, so the CRM has an honest
 *  record of "we opened WhatsApp for this lead" — never a fake
 *  delivered/read receipt, which normal click-to-chat cannot provide. */
export async function logWhatsAppActivityAction(
  leadId: string,
  action: WhatsAppActivityAction,
  templateName?: string
) {
  try {
    const admin = await profileService.getCurrentAdmin();
    await whatsappService.logActivity(leadId, action, {
      templateName,
      admin: admin?.name ?? "Admin",
    });
    revalidateAll(leadId);
  } catch (e) {
    console.error("logWhatsAppActivityAction failed:", e);
  }
}

export interface TemplateFormState {
  error?: string;
  success?: boolean;
}

export async function saveTemplateAction(
  id: string | null,
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!name) return { error: "Template name is required." };
  if (!content) return { error: "Template content is required." };

  try {
    if (id) {
      const updated = await whatsappService.updateTemplate(id, { name, content });
      if (!updated) return { error: "Template not found." };
    } else {
      await whatsappService.createTemplate({ name, content });
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save this template." };
  }

  revalidatePath("/admin/whatsapp/templates");
  return { success: true };
}

export async function deleteTemplateAction(id: string) {
  try {
    await whatsappService.deleteTemplate(id);
    revalidatePath("/admin/whatsapp/templates");
  } catch (e) {
    console.error("deleteTemplateAction failed:", e);
  }
}
