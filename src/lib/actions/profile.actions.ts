"use server";

import { revalidatePath } from "next/cache";
import { profileService } from "@/services/profileService";

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
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!name || !email) return { error: "Name and email are required." };
  if (newPassword && newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  try {
    const current = await profileService.getCurrentAdmin();
    if (!current) return { error: "You are not signed in." };

    await profileService.updateProfile({
      name,
      title: current.title,
      profileImage: profileImage || undefined,
    });

    if (email !== current.email) {
      await profileService.updateEmail(email);
    }
    if (newPassword) {
      await profileService.updatePassword(newPassword);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update your profile." };
  }

  revalidatePath("/admin/profile");
  return { success: true };
}
