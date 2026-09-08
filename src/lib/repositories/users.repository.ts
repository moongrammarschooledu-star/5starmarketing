import "server-only";
import type { AdminUser } from "@/lib/models/user";
import { globalStore } from "./global-store";

// Seeded from environment variables so no password ever lives in frontend
// code. Profile updates (name/email/password) mutate this in-memory record
// for the life of the server process — swap this repository for a Supabase
// `users` table in STEP 4 and nothing that calls it needs to change.
const store = globalStore<AdminUser>("admin-user", () => ({
  id: "admin-1",
  name: "Muhammad Munawar",
  title: "Director",
  email: process.env.ADMIN_EMAIL ?? "admin@5starm.com",
  role: "Director",
  profileImage: undefined,
  passwordHash: process.env.ADMIN_PASSWORD_HASH ?? "",
  createdAt: new Date("2026-01-15").toISOString(),
  updatedAt: new Date("2026-01-15").toISOString(),
}));

export const usersRepository = {
  async getAdmin(): Promise<AdminUser> {
    return store.get();
  },
  async getByEmail(email: string): Promise<AdminUser | undefined> {
    const user = store.get();
    return user.email.toLowerCase() === email.toLowerCase() ? user : undefined;
  },
  async update(input: Partial<Pick<AdminUser, "name" | "email" | "profileImage" | "passwordHash">>) {
    const next = { ...store.get(), ...input, updatedAt: new Date().toISOString() };
    store.set(next);
    return next;
  },
};
