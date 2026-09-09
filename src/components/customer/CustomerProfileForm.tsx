"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { AlertCircle, CheckCircle2, UserCircle } from "lucide-react";
import type { Customer } from "@/lib/models/customer";
import {
  updateCustomerProfileAction,
  updateCustomerEmailAction,
  updateCustomerPasswordAction,
  type CustomerProfileState,
} from "@/lib/actions/customer.actions";

export function CustomerProfileForm({ customer }: { customer: Customer }) {
  const [profileState, profileAction, profilePending] = useActionState<CustomerProfileState, FormData>(
    updateCustomerProfileAction,
    {}
  );
  const [emailState, emailAction, emailPending] = useActionState<CustomerProfileState, FormData>(
    updateCustomerEmailAction,
    {}
  );
  const [passwordState, passwordAction, passwordPending] = useActionState<CustomerProfileState, FormData>(
    updateCustomerPasswordAction,
    {}
  );
  const [preview, setPreview] = useState(customer.profileImage);

  function handleImage(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6">
      <form action={profileAction} className="space-y-6">
        {profileState?.error && <Alert tone="error" message={profileState.error} />}
        {profileState?.success && <Alert tone="success" message="Profile updated." />}

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-heading text-base font-bold text-ink">Profile Photo</h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted">
              {preview ? (
                <Image src={preview} alt={customer.fullName} width={64} height={64} className="h-full w-full object-cover" unoptimized />
              ) : (
                <UserCircle className="h-9 w-9 text-muted-foreground" />
              )}
            </div>
            <div>
              <input type="hidden" name="profileImage" value={preview ?? ""} />
              <label className="cursor-pointer rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
                Change Photo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files?.[0])} />
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-heading text-base font-bold text-ink">Account Details</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Full Name</span>
              <input
                type="text"
                name="fullName"
                required
                defaultValue={customer.fullName}
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Phone</span>
              <input
                type="tel"
                name="phone"
                defaultValue={customer.phone}
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-semibold text-ink">WhatsApp</span>
              <input
                type="tel"
                name="whatsapp"
                placeholder="Same as phone, if different"
                defaultValue={customer.whatsapp}
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
              />
            </label>
          </div>
        </section>

        <button
          type="submit"
          disabled={profilePending}
          className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {profilePending ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <form action={emailAction} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        {emailState?.error && <Alert tone="error" message={emailState.error} />}
        {emailState?.success && <Alert tone="success" message="Confirmation email sent to your new address." />}
        <h2 className="font-heading text-base font-bold text-ink">Email</h2>
        <p className="mt-1 text-xs text-muted">
          Changing this sends a confirmation link to the new address — it won&apos;t take effect until you click it.
        </p>
        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          <input
            type="email"
            name="email"
            required
            defaultValue={customer.email}
            className="w-full max-w-sm rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={emailPending}
            className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-60"
          >
            {emailPending ? "Updating..." : "Update Email"}
          </button>
        </div>
      </form>

      <form action={passwordAction} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        {passwordState?.error && <Alert tone="error" message={passwordState.error} />}
        {passwordState?.success && <Alert tone="success" message="Password updated." />}
        <h2 className="font-heading text-base font-bold text-ink">Change Password</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="password"
            name="password"
            placeholder="New password"
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm new password"
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
        <button
          type="submit"
          disabled={passwordPending}
          className="mt-3 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-60"
        >
          {passwordPending ? "Updating..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}

function Alert({ tone, message }: { tone: "error" | "success"; message: string }) {
  const isError = tone === "error";
  return (
    <div
      className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
        isError ? "border-primary/30 bg-primary/5 text-primary" : "border-success/30 bg-success/5 text-success"
      }`}
    >
      {isError ? <AlertCircle className="h-4.5 w-4.5 shrink-0" /> : <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />}
      {message}
    </div>
  );
}
