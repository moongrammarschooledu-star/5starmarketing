import "server-only";
import { redirect } from "next/navigation";
import { profileService } from "@/services/profileService";
import { canAccess, type AdminSection } from "./permissions";

/** Server-side page guard for role-restricted admin sections. The
 *  middleware already guarantees a logged-in session; this additionally
 *  enforces which sections that admin's role may see, redirecting to the
 *  dashboard instead of rendering a page the role isn't permitted to use. */
export async function requireSection(section: AdminSection): Promise<void> {
  const admin = await profileService.getCurrentAdmin();
  const role = admin?.role ?? "admin";
  if (!canAccess(role, section)) {
    redirect("/admin/dashboard");
  }
}
