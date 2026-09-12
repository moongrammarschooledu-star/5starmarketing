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
  | "documents"
  | "communications"
  | "accounting";

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
    "communications",
    "accounting",
  ],
  sales_manager: ["dashboard", "leads", "whatsapp", "profile", "appointments", "team", "followUps", "reports", "marketing", "deals", "inventory", "documents", "communications", "accounting"],
  editor: ["dashboard", "properties", "projects", "services", "profile", "brochures"],
  sales_agent: ["dashboard", "leads", "whatsapp", "profile", "appointments", "deals", "inventory", "documents", "communications"],
};

/** Communications (STEP 22) — assigning/transferring conversations and
 *  editing provider/business-hours settings is restricted the same way
 *  deal financials and marketing automation are. */
export function canManageCommunicationSettings(role: AdminRole): boolean {
  return role === "super_admin" || role === "admin" || role === "sales_manager";
}

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

/** Accounting (STEP 23) — approve/confirm/reconcile/export/manage-
 *  commission/process-refund actions, same three-role gate as every
 *  other finance-adjacent capability in this codebase. Consolidates
 *  the spec's nine listed permissions (approve_expense, confirm_
 *  transaction, manage_commission, approve_commission, process_refund,
 *  reconcile_transactions, export_financial_reports, view_financials)
 *  into one check — this app's RBAC is role-based throughout, not a
 *  granular per-action ACL, so nine near-identical functions would add
 *  no real distinction (deliberate simplification, disclosed here). */
export function canManageFinance(role: AdminRole): boolean {
  return role === "super_admin" || role === "admin" || role === "sales_manager";
}

/** A sales_agent may submit (not approve) their own expenses — the
 *  only accounting action available below the canManageFinance tier. */
export function canSubmitExpense(role: AdminRole): boolean {
  return canManageFinance(role) || role === "sales_agent";
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
