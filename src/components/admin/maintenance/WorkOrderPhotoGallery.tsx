"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Image as ImageIcon } from "lucide-react";
import type { MaintenancePhoto, PhotoType } from "@/lib/models/maintenance";
import { uploadWorkOrderPhotoAction, getMaintenancePhotoUrlAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

const PHOTO_TYPES: PhotoType[] = ["BEFORE", "DURING", "AFTER", "GENERAL"];

export function WorkOrderPhotoGallery({ workOrderId, photos }: { workOrderId: string; photos: MaintenancePhoto[] }) {
  const [photoType, setPhotoType] = useState<PhotoType>("BEFORE");
  const [isPending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  function handleFile(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.show("Please upload a JPG, PNG or WEBP image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      startTransition(async () => {
        try {
          await uploadWorkOrderPhotoAction(workOrderId, photoType, reader.result as string, undefined);
          toast.show(`${photoType} photo uploaded.`);
          router.refresh();
        } catch (e) {
          toast.show(e instanceof Error ? e.message : "Could not upload this photo.");
        }
      });
    };
    reader.readAsDataURL(file);
  }

  function view(photoId: string) {
    startTransition(async () => {
      try {
        const url = await getMaintenancePhotoUrlAction(photoId);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not open this photo.");
      }
    });
  }

  const grouped = PHOTO_TYPES.map((type) => ({ type, items: photos.filter((p) => p.photoType === type) }));

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={photoType} onChange={(e) => setPhotoType(e.target.value as PhotoType)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
          {PHOTO_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <button type="button" onClick={() => fileInput.current?.click()} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
          <Upload className="h-3.5 w-3.5" /> Upload {photoType} Photo
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {grouped.map(({ type, items }) => (
          <div key={type}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{type}</p>
            <div className="mt-2 space-y-2">
              {items.map((p) => (
                <button key={p.id} type="button" onClick={() => view(p.id)} className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface p-2.5 text-left hover:border-primary">
                  <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate text-xs text-ink">{p.caption || new Date(p.createdAt).toLocaleDateString("en-GB")}</span>
                </button>
              ))}
              {items.length === 0 && <p className="text-xs text-muted">No {type.toLowerCase()} photos yet.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
