import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { usersRepository } from "@/lib/repositories/users.repository";

export const metadata: Metadata = {
  title: {
    default: "Admin Dashboard",
    template: "%s | 5STAR.M Admin",
  },
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const admin = await usersRepository.getAdmin();

  return <AdminShell adminName={admin.name}>{children}</AdminShell>;
}
