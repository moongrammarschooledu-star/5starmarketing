"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, CheckCircle2, UserCircle, Copy } from "lucide-react";
import { adminRoles } from "@/lib/models/user";
import { roleLabels } from "@/lib/permissions";
import { createTeamMemberFormAction, type CreateTeamMemberFormState } from "@/lib/actions/team.actions";

export function TeamMemberForm() {
  const [state, formAction, pending] = useActionState<CreateTeamMemberFormState, FormData>(createTeamMemberFormAction, {});
  const [preview, setPreview] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  function handleImage(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  if (state?.tempPassword) {
    return (
      <div className="max-w-xl rounded-2xl border border-success/30 bg-success/5 p-6">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-5 w-5" />
          <h2 className="font-heading text-base font-bold">{state.memberName} was added to the team.</h2>
        </div>
        <p className="mt-3 text-sm text-ink">
          Share this one-time temporary password with them over WhatsApp or in person — it will not be shown again. They
          should change it from their Profile page after logging in.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3">
          <code className="flex-1 break-all text-sm font-bold text-ink">{state.tempPassword}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(state.tempPassword!).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary"
          >
            <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <Link href="/admin/team" className="mt-4 inline-block text-sm font-bold text-primary hover:underline">
          ← Back to Sales Team
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {state.error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Profile Photo</h2>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted">
            {preview ? (
              <Image src={preview} alt="Preview" width={64} height={64} className="h-full w-full object-cover" unoptimized />
            ) : (
              <UserCircle className="h-9 w-9 text-muted-foreground" />
            )}
          </div>
          <div>
            <input type="hidden" name="profileImage" value={preview ?? ""} />
            <label className="cursor-pointer rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
              Upload Photo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files?.[0])} />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Account Details</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Full Name *</span>
            <input name="fullName" required className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Email *</span>
            <input name="email" type="email" required className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Phone</span>
            <input name="phone" className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">WhatsApp</span>
            <input name="whatsapp" className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Role *</span>
            <select name="role" defaultValue="sales_agent" className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
              {adminRoles.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Status</span>
            <select name="status" defaultValue="Active" className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Profile</h2>
        <div className="mt-4 grid grid-cols-1 gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Specialization</span>
            <input name="specialization" placeholder="e.g. Residential Plots, DHA Sector Sales" className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Bio</span>
            <textarea name="bio" rows={3} className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
        </div>
      </section>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Creating..." : "Create Team Member"}
      </button>
    </form>
  );
}
