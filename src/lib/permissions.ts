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
  | "customers";

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
  ],
  editor: ["dashboard", "properties", "projects", "services", "profile"],
  sales_agent: ["dashboard", "leads", "whatsapp", "profile"],
};

export function canAccess(role: AdminRole, section: AdminSection): boolean {
  const sections = ROLE_SECTIONS[role] ?? [];
  return sections === "*" || sections.includes(section);
}

export const roleLabels: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  sales_agent: "Sales Agent",
};
