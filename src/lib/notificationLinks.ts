import type { NotificationCategory } from "@/lib/models/mobile";

/** Buckets a notification's own `type` string (e.g. "payment_overdue",
 *  "maintenance_request_received") into one of the fixed push-preference
 *  categories from STEP 31 section 24/41, by prefix. Deal/document/
 *  agreement lifecycle types are grouped under "payment" (the closest
 *  umbrella of the four) rather than adding a 12th category no other
 *  part of this codebase's UI distinguishes. Anything unrecognized
 *  falls back to "system" (on by default) rather than being silently
 *  miscategorized into a category the user may have muted. */
export function categoryForNotificationType(type: string): NotificationCategory {
  if (type.startsWith("appointment")) return "appointment";
  if (type.startsWith("maintenance")) return "maintenance";
  if (type.startsWith("support")) return "support";
  if (type.startsWith("legal")) return "legal";
  if (type.startsWith("construction")) return "construction";
  if (type.startsWith("marketing") || type.startsWith("campaign")) return "marketing";
  if (type.startsWith("rental") || type.startsWith("lease") || type.startsWith("rent_") || type.startsWith("landlord") || type.startsWith("tenant")) return "rental";
  if (
    type.startsWith("payment") ||
    type.startsWith("deal") ||
    type.startsWith("document") ||
    type.startsWith("agreement") ||
    type.startsWith("signature")
  )
    return "payment";
  if (type.startsWith("property") || type.startsWith("investment")) return "property";
  if (type.startsWith("inquiry") || type.startsWith("status_updated") || type.startsWith("follow_up")) return "lead";
  return "system";
}

/** Deep-link resolution for notifications (STEP 31, section 24/34).
 *
 *  A link is always COMPUTED from entityType/entityId — never stored
 *  redundantly on the notification row itself (same "derive, don't
 *  duplicate" rule the rest of this codebase follows). An entity type
 *  this function doesn't recognize, or one with no real detail route,
 *  returns null — the notification is still shown, it just isn't
 *  clickable, rather than ever guessing a route that might not exist.
 *
 *  Extends the STEP 14 admin/agent map that already lived inline in
 *  StaffNotificationBell.tsx (lead/appointment/follow_up) rather than
 *  replacing it.
 */
export type NotificationPortal = "admin" | "agent" | "customer";

export function resolveNotificationLink(
  portal: NotificationPortal,
  entityType: string | undefined,
  entityId: string | undefined
): string | null {
  if (!entityType || !entityId) return null;

  if (portal === "customer") {
    switch (entityType) {
      case "appointment":
        return `/customer/appointments/${entityId}`;
      case "support_ticket":
        return `/customer/support/tickets/${entityId}`;
      case "support_complaint":
        return `/customer/support/complaints`;
      case "maintenance_request":
        return `/customer/maintenance/${entityId}`;
      case "deal":
        return `/customer/deals/${entityId}`;
      case "document":
        return `/customer/documents/${entityId}`;
      case "lease":
      case "rental_notice":
      case "rent_payment":
        return `/customer/rentals/${entityId}`;
      case "investment_analysis":
        return `/customer/investments/${entityId}`;
      default:
        return null;
    }
  }

  // admin / agent — both are staff (admin_profiles) portals, so most
  // entity types resolve to the same /admin/* detail route regardless
  // of which shell is rendering the bell.
  switch (entityType) {
    case "lead":
      return `/${portal}/leads/${entityId}`;
    case "appointment":
      return portal === "agent" ? `/agent/appointments` : `/admin/appointments/${entityId}`;
    case "follow_up":
      return portal === "agent" ? `/agent/dashboard` : `/admin/follow-ups`;
    case "deal":
      return portal === "agent" ? `/agent/deals` : `/admin/deals/${entityId}`;
    case "support_ticket":
      return `/admin/support/tickets/${entityId}`;
    case "maintenance_request":
      return `/admin/maintenance/requests/${entityId}`;
    case "document":
      return `/admin/documents/${entityId}`;
    case "rental_notice":
      return `/admin/rentals/notices`;
    default:
      return null;
  }
}
