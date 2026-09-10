import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { profileService } from "@/services/profileService";
import { leadService } from "@/services/leadService";
import type { AdminRole } from "@/lib/models/user";

export const metadata: Metadata = {
  title: {
    default: "Admin Dashboard",
    template: "%s | 5STAR.M Admin",
  },
  robots: { index: false, follow: false },
};

// Every route under here is authenticated and reads live data — never
// prerender it statically (that would also mean running Supabase calls
// at build time, before real credentials necessarily exist).
export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  // The middleware already guarantees a logged-in user reaches this layout,
  // so a missing profile here just falls back to a generic label rather
  // than blocking the page.
  let adminId = "";
  let adminName = "Admin";
  let role: AdminRole = "admin";
  let newLeadsCount = 0;
  try {
    const admin = await profileService.getCurrentAdmin();
    if (admin?.id) adminId = admin.id;
    if (admin?.name) adminName = admin.name;
    if (admin?.role) role = admin.role;
  } catch (e) {
    console.error("AdminPanelLayout: failed to load current admin:", e);
  }
  try {
    newLeadsCount = (await leadService.stats()).new;
  } catch (e) {
    console.error("AdminPanelLayout: failed to load lead stats:", e);
  }

  return (
    <AdminShell adminId={adminId} adminName={adminName} role={role} newLeadsCount={newLeadsCount}>
      {children}
    </AdminShell>
  );
}
