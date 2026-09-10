import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { profileService } from "@/services/profileService";
import { TeamMemberForm } from "@/components/admin/TeamMemberForm";

export const dynamic = "force-dynamic";

export default async function AdminTeamCreatePage() {
  // Only Super Admin/Admin create accounts — Sales Manager can assign
  // leads and manage the team's work, but not provision new logins.
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !["super_admin", "admin"].includes(admin.role)) {
    redirect("/admin/team");
  }

  return (
    <div>
      <Link href="/admin/team" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Sales Team
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-extrabold text-ink">Add Team Member</h1>
      <p className="mt-1 text-sm text-muted">
        Creates a real Supabase Auth account for this person — no duplicate accounts are ever created for the same email.
      </p>
      <div className="mt-6">
        <TeamMemberForm />
      </div>
    </div>
  );
}
