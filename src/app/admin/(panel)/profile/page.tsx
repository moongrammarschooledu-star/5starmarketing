import { usersRepository } from "@/lib/repositories/users.repository";
import { toPublicUser } from "@/lib/models/user";
import { ProfileForm } from "@/components/admin/ProfileForm";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const user = toPublicUser(await usersRepository.getAdmin());

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Admin Profile</h1>
      <p className="mt-1 text-sm text-muted">
        {user.name} — {user.title}
      </p>

      <div className="mt-6">
        <ProfileForm user={user} />
      </div>
    </div>
  );
}
