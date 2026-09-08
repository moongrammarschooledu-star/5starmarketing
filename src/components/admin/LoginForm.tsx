"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, AlertCircle, Mail, Lock } from "lucide-react";
import { loginAction, type LoginState } from "@/lib/actions/auth.actions";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {state.error}
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink">Email</span>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="admin@5starm.com"
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-primary"
          />
        </div>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink">Password</span>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-10 text-sm text-ink outline-none transition-colors focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 font-medium text-ink">
          <input
            type="checkbox"
            name="rememberMe"
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          Remember me
        </label>
        <button
          type="button"
          onClick={() => setForgotOpen((v) => !v)}
          className="font-semibold text-primary hover:underline"
        >
          Forgot Password?
        </button>
      </div>

      {forgotOpen && (
        <p className="rounded-lg bg-surface-muted px-4 py-3 text-xs leading-relaxed text-muted">
          Password reset isn&apos;t connected yet — it needs a backend (STEP 4). For now, contact
          whoever set up this dashboard to reset your password directly.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover disabled:translate-y-0 disabled:opacity-60"
      >
        {pending ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
