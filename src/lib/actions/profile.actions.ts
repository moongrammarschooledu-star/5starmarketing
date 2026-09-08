"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { usersRepository } from "@/lib/repositories/users.repository";

export interface ProfileFormState {
  error?: string;
  success?: boolean;
}

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const profileImage = String(formData.get("profileImage") ?? "").trim();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!name || !email) return { error: "Name and email are required." };

  const user = await usersRepository.getAdmin();

  if (newPassword) {
    if (!currentPassword) {
      return { error: "Enter your current password to set a new one." };
    }
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      return { error: "Current password is incorrect." };
    }
    if (newPassword.length < 8) {
      return { error: "New password must be at least 8 characters." };
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await usersRepository.update({ name, email, profileImage: profileImage || undefined, passwordHash });
  } else {
    await usersRepository.update({ name, email, profileImage: profileImage || undefined });
  }

  revalidatePath("/admin/profile");
  return { success: true };
}
