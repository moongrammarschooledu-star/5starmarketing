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

/** WhatsApp Business API template-approval status (section 15) — only
 *  ever APPROVED once a real provider confirms it; meaningless for
 *  Email/SMS templates. */
export type TemplateProviderStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "PAUSED";
export const templateProviderStatuses: TemplateProviderStatus[] = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "PAUSED"];

export interface MarketingTemplate {
  id: string;
  name: string;
  channel: MarketingTemplateChannel;
  category: MarketingTemplateCategory;
  subject?: string;
  content: string;
  version: number;
  active: boolean;
  providerStatus: TemplateProviderStatus;
  providerTemplateId?: string;
  language: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type MarketingTemplateInput = Pick<MarketingTemplate, "name" | "channel" | "category" | "subject" | "content">;
export type TemplateProviderInfoInput = { providerStatus: TemplateProviderStatus; providerTemplateId?: string; language: string };

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
  "{{deal_amount}}",
  "{{payment_amount}}",
  "{{outstanding_amount}}",
  "{{due_date}}",
] as const;
