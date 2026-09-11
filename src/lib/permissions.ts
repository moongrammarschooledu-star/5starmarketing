import type { AdminRole } from "./models/user";

/** One entry per admin-facing feature area — matches the sidebar/route
 *  structure under /admin. "*" means "every section". */
export type AdminSection =
  | "dashboard"
  | "properties"
  | "projects"
  | "leads"
  | "whatsapp"
  | "services"
  | "seo"
  | "settings"
  | "profile"
  | "reports"
  | "activity"
  | "customers"
  | "appointments"
  | "brochures"
  | "team"
  | "followUps"
  | "marketing"
  | "deals"
  | "inventory"
  | "documents";

const ROLE_SECTIONS: Record<AdminRole, AdminSection[] | "*"> = {
  super_admin: "*",
  admin: [
    "dashboard",
    "properties",
    "projects",
    "leads",
    "whatsapp",
    "services",
    "seo",
    "settings",
    "profile",
    "reports",
    "activity",
    "customers",
    "appointments",
    "brochures",
    "team",
    "followUps",
    "marketing",
    "deals",
    "inventory",
    "documents",
  ],
  sales_manager: ["dashboard", "leads", "whatsapp", "profile", "appointments", "team", "followUps", "reports", "marketing", "deals", "inventory", "documents"],
  editor: ["dashboard", "properties", "projects", "services", "profile", "brochures"],
  sales_agent: ["dashboard", "leads", "whatsapp", "profile", "appointments", "deals", "inventory", "documents"],
};

/** Fine-grained Deals capabilities (section 53-55) — the section-level
 *  "deals" check above only gates overall visibility; these gate the
 *  financially-sensitive actions within it. Deliberately code-level
 *  (not a DB permissions table) since the existing RBAC model in this
 *  codebase is role-based throughout, not a granular ACL system — this
 *  mirrors that same approach for Deals specifically. */
export function canManageDealFinancials(role: AdminRole): boolean {
  return role === "super_admin" || role === "admin" || role === "sales_manager";
}

/** Marketing Automation (STEP 21) — rules/workflows/templates editing is
 *  restricted the same way deal financials are; same code-level,
 *  role-based (not a granular ACL) philosophy as the rest of this app. */
export function canManageMarketingAutomation(role: AdminRole): boolean {
  return role === "super_admin" || role === "admin" || role === "sales_manager";
}

export function canAccess(role: AdminRole, section: AdminSection): boolean {
  const sections = ROLE_SECTIONS[role] ?? [];
  return sections === "*" || sections.includes(section);
}

export const roleLabels: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  sales_manager: "Sales Manager",
  editor: "Editor",
  sales_agent: "Sales Agent",
};
