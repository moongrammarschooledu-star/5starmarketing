export type MobileActorType = "ADMIN" | "CUSTOMER";

export interface PushSubscriptionRecord {
  id: string;
  actorType: MobileActorType;
  actorId: string;
  endpoint: string;
  p256dh: string;
  authKey: string;
  deviceLabel?: string;
  userAgent?: string;
  createdAt: string;
  lastSeenAt: string;
}

/** The raw shape the browser's PushManager.subscribe() promise resolves
 *  to (via subscription.toJSON()) — what the client sends to the
 *  register action. */
export interface WebPushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export type NotificationCategory =
  | "property"
  | "lead"
  | "appointment"
  | "payment"
  | "rental"
  | "maintenance"
  | "support"
  | "legal"
  | "construction"
  | "marketing"
  | "system";

export interface MobileAppPreferences {
  actorType: MobileActorType;
  actorId: string;
  pushEnabled: boolean;
  notifyProperty: boolean;
  notifyLead: boolean;
  notifyAppointment: boolean;
  notifyPayment: boolean;
  notifyRental: boolean;
  notifyMaintenance: boolean;
  notifySupport: boolean;
  notifyLegal: boolean;
  notifyConstruction: boolean;
  notifyMarketing: boolean;
  notifySystem: boolean;
  theme: "system" | "light" | "dark";
  language: string;
  updatedAt: string;
}

export type MobileAppPreferencesInput = Partial<
  Omit<MobileAppPreferences, "actorType" | "actorId" | "updatedAt">
>;

export type PwaInstallEventType = "PROMPT_SHOWN" | "INSTALLED" | "DISMISSED";

export interface PwaInstallEvent {
  id: string;
  actorType?: MobileActorType;
  actorId?: string;
  eventType: PwaInstallEventType;
  platform?: string;
  userAgent?: string;
  createdAt: string;
}

export interface PwaInstallStats {
  promptShown: number;
  installed: number;
  dismissed: number;
  sinceDays: number;
}

/** A push payload — always plain, honest content, never fabricated
 *  delivery guarantees (see src/lib/push/provider.ts). */
export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}
