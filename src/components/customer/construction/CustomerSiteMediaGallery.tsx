"use client";

import { useTransition } from "react";
import { Image as ImageIcon } from "lucide-react";
import type { ConstructionSiteMedia } from "@/lib/models/construction";
import { getSiteMediaUrlAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function CustomerSiteMediaGallery({ media }: { media: ConstructionSiteMedia[] }) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function view(mediaId: string) {
    startTransition(async () => {
      try {
        const url = await getSiteMediaUrlAction(mediaId);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not open this file.");
      }
    });
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {media.map((m) => (
        <button key={m.id} type="button" onClick={() => view(m.id)} disabled={isPending} className="rounded-xl border border-border bg-surface p-3 text-left hover:border-primary">
          <div className="flex h-20 w-full items-center justify-center rounded-lg bg-surface-muted text-muted">
            <ImageIcon className="h-6 w-6" />
          </div>
          {m.caption && <p className="mt-1.5 truncate text-[11px] text-muted">{m.caption}</p>}
        </button>
      ))}
      {media.length === 0 && <p className="col-span-full text-sm text-muted">No site photos or videos have been shared yet.</p>}
    </div>
  );
}
