"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { leadService } from "@/services/leadService";
import { activityService } from "@/services/activityService";
import { parsePriceText } from "@/lib/pkUnits";
import { WHATSAPP_LEAD_ADS, WHATSAPP_LEAD_WANTS, WHATSAPP_LEAD_STATUSES } from "@/lib/whatsappLead";
import type { LeadInput } from "@/lib/models/lead";

export interface WhatsAppLeadFormState {
  error?: string;
}

const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

function text(formData: FormData, name: string, max = 2000): string {
  return String(formData.get(name) ?? "").trim().slice(0, max);
}

/** Staff saves someone who wrote to the company WhatsApp (from an ad or
 *  anywhere else) as a real lead, so it is counted and followed up in the CRM. */
export async function createWhatsAppLeadAction(_prev: WhatsAppLeadFormState, formData: FormData): Promise<WhatsAppLeadFormState> {
  const name = text(formData, "name", 120);
  const phone = text(formData, "phone", 40);
  if (!name) return { error: "Naam likhna zaroori hai." };
  if (!PHONE_PATTERN.test(phone)) return { error: "Phone number theek nahi lagta (sirf number, + aur - chalte hain)." };

  const ad = WHATSAPP_LEAD_ADS.find((a) => a.value === text(formData, "ad", 60)) ?? WHATSAPP_LEAD_ADS[WHATSAPP_LEAD_ADS.length - 1];
  const want = WHATSAPP_LEAD_WANTS.find((w) => w.value === text(formData, "want", 40)) ?? WHATSAPP_LEAD_WANTS[WHATSAPP_LEAD_WANTS.length - 1];
  const status = WHATSAPP_LEAD_STATUSES.find((s) => s === text(formData, "status", 20)) ?? "Contacted";
  const area = text(formData, "area", 200);
  const budgetText = text(formData, "budget", 80);
  const notes = text(formData, "notes");

  const budget = budgetText ? parsePriceText(budgetText) : null;
  const message = [
    ad.campaign ? `WhatsApp chat (${ad.label})` : "WhatsApp chat",
    `Kya chahiye: ${want.label}`,
    area ? `Area: ${area}` : undefined,
    budgetText ? `Budget: ${budgetText}` : undefined,
    notes ? `\n${notes}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  const fromAd = Boolean(ad.campaign);
  const source = fromAd ? "facebook" : "whatsapp";
  const medium = fromAd ? "click_to_whatsapp" : "chat";
  const leadInput: LeadInput = {
    name,
    phone,
    whatsapp: phone,
    leadType: want.leadType,
    purpose: want.purpose,
    message,
    source: "WhatsApp",
    status,
    preferredContactMethod: "WhatsApp",
    preferredLocation: area || undefined,
    budgetMax: budget ?? undefined,
    consent: true,
    firstTouchSource: source,
    firstTouchMedium: medium,
    firstTouchCampaign: ad.campaign || undefined,
    lastTouchSource: source,
    lastTouchMedium: medium,
    lastTouchCampaign: ad.campaign || undefined,
  };

  try {
    await leadService.create(leadInput);
    await activityService.log("Added Lead", `${name} - WhatsApp chat`, "lead");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Lead save nahi ho saki." };
  }
  revalidatePath("/admin/leads");
  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/leads");
  revalidatePath("/admin/dashboard");
  redirect("/admin/leads?added=1");
}
