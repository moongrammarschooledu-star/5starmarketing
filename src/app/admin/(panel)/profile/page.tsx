import { redirect } from "next/navigation";
import { profileService } from "@/services/profileService";
import { ProfileForm } from "@/components/admin/ProfileForm";
import { roleLabels } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const user = await profileService.getCurrentAdmin();
  if (!user) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Admin Profile</h1>
      <p className="mt-1 text-sm text-muted">
        {user.name} — {user.title}
      </p>
      <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
        Role: {roleLabels[user.role]}
      </span>

      <div className="mt-6">
        <ProfileForm user={user} />
      </div>
    </div>
  );
}
