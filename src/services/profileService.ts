import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AdminUser, AdminProfileInput } from "@/lib/models/user";

export const profileService = {
  /** Null when nobody is logged in — callers (e.g. the admin layout) treat
   *  that as "redirect to login," though the middleware already guards
   *  every /admin/* route before a page even renders. */
  async getCurrentAdmin(): Promise<AdminUser | null> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from("admin_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("profileService.getCurrentAdmin failed:", error);
    }

    return {
      id: user.id,
      email: user.email ?? "",
      name: profile?.name ?? "Admin",
      title: profile?.title ?? "Administrator",
      role: (profile?.role as AdminUser["role"]) ?? "admin",
      profileImage: profile?.profile_image ?? undefined,
      createdAt: profile?.created_at ?? user.created_at,
      updatedAt: profile?.updated_at ?? user.created_at,
    };
  },

  async updateProfile(input: AdminProfileInput): Promise<void> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in.");

    const { error } = await supabase
      .from("admin_profiles")
      .update({
        name: input.name,
        title: input.title,
        profile_image: input.profileImage || null,
      })
      .eq("id", user.id);

    if (error) {
      console.error("profileService.updateProfile failed:", error);
      throw new Error("Could not update your profile.");
    }
  },

  async updateEmail(newEmail: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      console.error("profileService.updateEmail failed:", error);
      throw new Error(error.message || "Could not update your email.");
    }
  },

  async updatePassword(newPassword: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      console.error("profileService.updatePassword failed:", error);
      throw new Error(error.message || "Could not update your password.");
    }
  },
};
