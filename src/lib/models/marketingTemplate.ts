export type MarketingTemplateChannel = "Email" | "WhatsApp" | "SMS";
export const marketingTemplateChannels: MarketingTemplateChannel[] = ["Email", "WhatsApp", "SMS"];

export type MarketingTemplateCategory =
  | "Lead Received"
  | "Property Inquiry"
  | "Site Visit Confirmation"
  | "Brochure Request"
  | "Follow-up Reminder"
  | "Agreement Ready"
  | "Payment Reminder"
  | "Thank You"
  | "Lead Re-engagement"
  | "Other";

export const marketingTemplateCategories: MarketingTemplateCategory[] = [
  "Lead Received",
  "Property Inquiry",
  "Site Visit Confirmation",
  "Brochure Request",
  "Follow-up Reminder",
  "Agreement Ready",
  "Payment Reminder",
  "Thank You",
  "Lead Re-engagement",
  "Other",
];

export interface MarketingTemplate {
  id: string;
  name: string;
  channel: MarketingTemplateChannel;
  category: MarketingTemplateCategory;
  subject?: string;
  content: string;
  version: number;
  active: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type MarketingTemplateInput = Pick<MarketingTemplate, "name" | "channel" | "category" | "subject" | "content">;

/** {{variable}} placeholders (section 26) — populated exclusively from
 *  real Supabase records at send/generation time, same discipline as the
 *  STEP 20 document-template variables. */
export const MARKETING_TEMPLATE_VARIABLES = [
  "{{customer_name}}",
  "{{customer_phone}}",
  "{{customer_email}}",
  "{{property_title}}",
  "{{property_price}}",
  "{{property_location}}",
  "{{project_name}}",
  "{{agent_name}}",
  "{{agent_phone}}",
  "{{site_visit_date}}",
  "{{site_visit_time}}",
  "{{deal_number}}",
  "{{company_name}}",
] as const;
