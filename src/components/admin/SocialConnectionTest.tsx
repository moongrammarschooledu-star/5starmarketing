"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { testSocialConnectionAction } from "@/lib/actions/social.actions";

/** Asks Meta who the saved credentials belong to. Nothing is posted. */
export function SocialConnectionTest({ anyConnected }: { anyConnected: boolean }) {
  const [pending, startTransition] = useTransition();
  const [lines, setLines] = useState<{ platform: string; ok: boolean; detail: string }[]>([]);
  const [error, setError] = useState("");

  function run() {
    setError("");
    setLines([]);
    startTransition(async () => {
      const res = await testSocialConnectionAction();
      if (res.error) {
        setError(res.error);
        return;
      }
      const next: { platform: string; ok: boolean; detail: string }[] = [];
      if (res.facebook) next.push({ platform: "Facebook", ...res.facebook });
      if (res.instagram) next.push({ platform: "Instagram", ...res.instagram });
      setLines(next);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={pending || !anyConnected}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2.5 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} /> {pending ? "Checking..." : "Test connection"}
      </button>
      {!anyConnected && <p className="mt-2 text-xs text-muted">Add the settings below first, then test.</p>}
      {error && <p className="mt-2 text-xs font-semibold text-primary">{error}</p>}
      {lines.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {lines.map((l) => (
            <li key={l.platform} className="flex items-start gap-2 text-xs">
              {l.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
              <span className={l.ok ? "text-ink" : "text-primary"}>
                <b>{l.platform}:</b> {l.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
