export type DateRangeKey = "today" | "7d" | "30d" | "90d" | "year" | "custom";

export interface DateRange {
  key: DateRangeKey;
  /** Inclusive ISO start (Asia/Karachi calendar day boundary). */
  from: string;
  /** Exclusive ISO end. */
  to: string;
  label: string;
}

export const dateRangeOptions: { key: DateRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "90d", label: "90 Days" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom Range" },
];

export interface CountBucket {
  label: string;
  count: number;
}

export interface PropertyAnalytics {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  featured: number;
  byType: CountBucket[];
  byStatus: CountBucket[];
  byLocation: CountBucket[];
  byPaymentOption: CountBucket[];
}

export interface LeadAnalytics {
  total: number;
  new: number;
  contacted: number;
  interested: number;
  followUp: number;
  closed: number;
  lost: number;
  bySource: CountBucket[];
  byStatus: CountBucket[];
  overTime: { date: string; count: number }[];
  topProperties: CountBucket[];
}

export interface ConversionMetrics {
  hasEnoughData: boolean;
  totalLeads: number;
  /** Inquiry → Contacted: share of leads that moved past "New". */
  contactRate: number | null;
  /** Contacted → Interested: of contacted leads, how many reached Interested or beyond. */
  interestRate: number | null;
  /** Interested → Closed: of leads reaching Interested or beyond, how many closed. */
  leadConversionRate: number | null;
  /** Of leads that reached a final outcome (closed or lost), the share that closed. */
  closedLeadRate: number | null;
}

export interface PropertyPerformanceRow {
  propertyId: string;
  title: string;
  status: string;
  views: number;
  inquiries: number;
  whatsappClicks: number;
}

export interface ActivityLogEntry {
  id: string;
  adminName: string;
  action: string;
  entityType?: string;
  entityId?: string;
  description: string;
  createdAt: string;
}

export interface DashboardOverview {
  totalProperties: number;
  availableProperties: number;
  reservedProperties: number;
  soldProperties: number;
  totalProjects: number;
  activeProjects: number;
  totalLeads: number;
  newLeads: number;
  followUpsDue: number;
  closedLeads: number;
}

export interface AttentionItem {
  label: string;
  count: number;
  href: string;
}

export interface DataQualityIssue {
  propertyId: string;
  title: string;
  missing: string[];
}
