"use client";

import { useTransition } from "react";
import { setCustomerDisabledAction } from "@/lib/actions/customers.actions";
import { useToast } from "./ToastProvider";

export function CustomerDisableToggle({ id, disabled }: { id: string; disabled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await setCustomerDisabledAction(id, !disabled);
          toast.show(disabled ? "Account enabled." : "Account disabled.");
        })
      }
      className="rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
    >
      {disabled ? "Enable Account" : "Disable Account"}
    </button>
  );
}
