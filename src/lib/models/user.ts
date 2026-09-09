// Admin identity is now entirely Supabase Auth + admin_profiles — there is
// no password field here at all. Supabase's GoTrue service owns the
// password (hashing, verification, reset flows); this app never sees it.
export type AdminRole = "super_admin" | "admin" | "editor" | "sales_agent";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  title: string;
  role: AdminRole;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export type AdminProfileInput = Pick<AdminUser, "name" | "title" | "profileImage">;
