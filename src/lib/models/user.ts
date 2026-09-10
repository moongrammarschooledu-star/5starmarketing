// Admin identity is now entirely Supabase Auth + admin_profiles — there is
// no password field here at all. Supabase's GoTrue service owns the
// password (hashing, verification, reset flows); this app never sees it.
export type AdminRole = "super_admin" | "admin" | "editor" | "sales_agent" | "sales_manager";
export type AdminAccountStatus = "Active" | "Inactive";
export type AdminAvailability = "Available" | "Busy" | "On Leave" | "Inactive";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  title: string;
  role: AdminRole;
  profileImage?: string;
  phone?: string;
  whatsapp?: string;
  specialization?: string;
  bio?: string;
  status: AdminAccountStatus;
  availability: AdminAvailability;
  createdAt: string;
  updatedAt: string;
}

export type AdminProfileInput = Pick<AdminUser, "name" | "title" | "profileImage">;

export const adminRoles: AdminRole[] = ["super_admin", "admin", "sales_manager", "sales_agent", "editor"];

/** /admin/team/create form fields. No password field — teamService.create
 *  generates one and hands it back once so the admin can share it with
 *  the new team member, who is expected to change it on first login. */
export type TeamMemberInput = {
  fullName: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  profileImage?: string;
  role: AdminRole;
  status: AdminAccountStatus;
  specialization?: string;
  bio?: string;
};

export type TeamMemberUpdateInput = Partial<Omit<TeamMemberInput, "email">>;
