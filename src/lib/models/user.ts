export type AdminRole = "Admin" | "Director";

export interface AdminUser {
  id: string;
  name: string;
  title: string;
  email: string;
  role: AdminRole;
  profileImage?: string;
  /** bcrypt hash — never sent to the client. */
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export type AdminUserPublic = Omit<AdminUser, "passwordHash">;

export function toPublicUser(user: AdminUser): AdminUserPublic {
  const { passwordHash, ...rest } = user;
  void passwordHash;
  return rest;
}
