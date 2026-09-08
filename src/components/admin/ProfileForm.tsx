"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { AlertCircle, CheckCircle2, UserCircle } from "lucide-react";
import type { AdminUserPublic } from "@/lib/models/user";
import { updateProfileAction, type ProfileFormState } from "@/lib/actions/profile.actions";

export function ProfileForm({ user }: { user: AdminUserPublic }) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(updateProfileAction, {});
  const [preview, setPreview] = useState(user.profileImage);

  function handleImage(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {state.error}
        </div>
      )}
      {state?.success && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> Profile updated.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Profile Photo</h2>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted">
            {preview ? (
              <Image src={preview} alt={user.name} width={64} height={64} className="h-full w-full object-cover" unoptimized />
            ) : (
              <UserCircle className="h-9 w-9 text-muted-foreground" />
            )}
          </div>
          <div>
            <input type="hidden" name="profileImage" value={preview ?? ""} />
            <label className="cursor-pointer rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
              Change Photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImage(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Account Details</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Name</span>
            <input
              type="text"
              name="name"
              required
              defaultValue={user.name}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Email</span>
            <input
              type="email"
              name="email"
              required
              defaultValue={user.email}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
        </div>
        <div className="mt-3 text-xs text-muted">
          Role: <span className="font-semibold text-ink">{user.title}</span>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Change Password</h2>
        <p className="mt-1 text-xs text-muted">Leave blank to keep your current password.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Current Password</span>
            <input
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">New Password</span>
            <input
              type="password"
              name="newPassword"
              autoComplete="new-password"
              minLength={8}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
        </div>
      </section>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
