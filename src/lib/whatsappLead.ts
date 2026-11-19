import type { LeadPurpose, LeadStatus, LeadType } from "@/lib/models/lead";

// Choices on the "Add lead from WhatsApp" form. Kept apart from the server action
// because a "use server" file may only export async functions.

/** Which ad the person came from. `campaign` is the tracking name saved on the lead
 *  (empty = not from an ad). */
export const WHATSAPP_LEAD_ADS: { value: string; label: string; campaign: string }[] = [
  { value: "rent", label: "Rent Lena/Dena Johar Town ad", campaign: "wa_rent_lena_dena" },
  { value: "sale10", label: "Property Sale 10 Marla ad", campaign: "wa_sale_10marla" },
  { value: "corner21", label: "21 Marla Corner House ad", campaign: "wa_21marla_corner" },
  { value: "plaza", label: "10 Marla Plaza Valencia ad", campaign: "wa_plaza_valencia" },
  { value: "other-ad", label: "Koi aur Facebook / Instagram ad", campaign: "wa_other_ad" },
  { value: "none", label: "Ad se nahi (referral, signboard, pehle ka client)", campaign: "" },
];

export const WHATSAPP_LEAD_WANTS: { value: string; label: string; leadType: LeadType; purpose?: LeadPurpose }[] = [
  { value: "rent-in", label: "Kiraye par lena chahta hai (kirayedar)", leadType: "Rental Inquiry", purpose: "Rent" },
  { value: "rent-out", label: "Apni property kiraye par deni hai (malik)", leadType: "Rental Inquiry", purpose: "Rent" },
  { value: "buy", label: "Khareedna chahta hai", leadType: "Property Details", purpose: "Buy" },
  { value: "sell", label: "Apni property bechni hai", leadType: "Seller Inquiry" },
  { value: "other", label: "Kuch aur", leadType: "General Inquiry" },
];

export const WHATSAPP_LEAD_STATUSES: LeadStatus[] = ["Contacted", "New", "Interested", "Follow-Up", "Site Visit"];
