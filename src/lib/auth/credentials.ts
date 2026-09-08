import "server-only";
import bcrypt from "bcryptjs";
import { usersRepository } from "@/lib/repositories/users.repository";

// The swap point for STEP 4: replace this function's body with a call to
// Supabase Auth (or Firebase Auth) — everything that calls it (the login
// server action) stays the same because the return shape doesn't change.
export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const user = await usersRepository.getByEmail(email.trim());

  if (!user || !user.passwordHash) {
    return { ok: false, error: "Invalid email or password." };
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return { ok: false, error: "Invalid email or password." };
  }

  return { ok: true, email: user.email };
}
