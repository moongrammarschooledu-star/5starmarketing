"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import {
  sendLoginCodeAction,
  verifyLoginCodeAction,
  type TwoFactorState,
} from "@/lib/actions/adminTwoFactor.actions";
import { logoutAction } from "@/lib/actions/auth.actions";

export function VerifyForm({ redirectTo, needsSend }: { redirectTo: string; needsSend: boolean }) {
  const [state, formAction, pending] = useActionState<TwoFactorState, FormData>(verifyLoginCodeAction, {});
  const [sendState, setSendState] = useState<TwoFactorState>({});
  const [sending, startSending] = useTransition();
  const sentOnce = useRef(false);

  function send() {
    startSending(async () => setSendState(await sendLoginCodeAction()));
  }

  useEffect(() => {
    if (needsSend && !sentOnce.current) {
      sentOnce.current = true;
      send();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const error = state?.error ?? sendState.error;

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
        </div>
      )}
      {!error && sendState.info && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm font-semibold text-ink">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> {sendState.info}
        </div>
      )}

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">6-digit code</span>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
              placeholder="123456"
              className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm tracking-[0.3em] text-ink outline-none transition-colors focus:border-primary"
            />
          </div>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover disabled:translate-y-0 disabled:opacity-60"
        >
          {pending ? "Checking..." : "Verify and continue"}
        </button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={send}
          disabled={sending}
          className="font-semibold text-primary hover:underline disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send a new code"}
        </button>
        <form action={logoutAction}>
          <button type="submit" className="font-semibold text-muted hover:text-ink">
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
