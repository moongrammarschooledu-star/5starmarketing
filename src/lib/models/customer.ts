export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  profileImage?: string;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CustomerProfileInput = Pick<Customer, "fullName" | "phone" | "whatsapp" | "profileImage">;

export interface Favorite {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: string;
}

export interface PropertyAlert {
  id: string;
  userId: string;
  propertyType?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  purpose?: string;
  enabled: boolean;
  // STEP 16 — architecture for future "notify me when matching
  // properties are added" automation (no sending implemented here).
  savedSearchId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filtersJson?: Record<string, any>;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type PropertyAlertInput = Omit<PropertyAlert, "id" | "userId" | "createdAt" | "updatedAt">;

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  propertyType?: string;
  location?: string;
  sizeCategory?: string;
  purpose?: string;
  /** STEP 16 — full advanced-search filter snapshot (JSON), alongside
   *  the loose text fields above which stay for backward compatibility. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filtersJson?: Record<string, any>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SavedSearchInput = Omit<SavedSearch, "id" | "userId" | "createdAt" | "updatedAt">;

export type NotificationType =
  | "inquiry_received"
  | "status_updated"
  | "follow_up_scheduled"
  | "property_status_changed"
  | "appointment_created"
  | "appointment_confirmed"
  | "appointment_rescheduled"
  | "appointment_cancelled"
  | "appointment_completed"
  // STEP 18 — Deals
  | "deal_status_updated"
  | "document_approved"
  | "payment_due"
  | "payment_overdue"
  | "payment_received";

export interface CustomerNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

/** Admin-facing summary row for /admin/customers. */
export interface CustomerSummary extends Customer {
  savedPropertiesCount: number;
  inquiryCount: number;
}
