import { redirect } from "next/navigation";
import { profileService } from "@/services/profileService";
import { mobilePreferencesService } from "@/services/mobilePreferencesService";
import { ProfileForm } from "@/components/admin/ProfileForm";
import { PushSubscribeToggle } from "@/components/pwa/PushSubscribeToggle";
import { NotificationPreferencesForm } from "@/components/pwa/NotificationPreferencesForm";
import { roleLabels } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const user = await profileService.getCurrentAdmin();
  if (!user) redirect("/admin/login");
  const prefs = await mobilePreferencesService.get("ADMIN", user.id);

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

      <div className="mt-8 border-t border-border pt-6">
        <h2 className="font-heading text-sm font-bold text-ink">Notifications on this device</h2>
        <div className="mt-2">
          <PushSubscribeToggle />
        </div>
        <h2 className="mt-6 font-heading text-sm font-bold text-ink">What you get notified about</h2>
        <div className="mt-2">
          <NotificationPreferencesForm initial={prefs} />
        </div>
      </div>
    </div>
  );
}
