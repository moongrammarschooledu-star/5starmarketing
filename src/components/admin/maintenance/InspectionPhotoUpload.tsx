"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import type { InspectionPhoto } from "@/lib/models/maintenance";
import { uploadInspectionPhotoAction, removeInspectionPhotoAction, getInspectionPhotoUrlAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function InspectionPhotoUpload({ inspectionId, propertyId, photos }: { inspectionId: string; propertyId: string; photos: InspectionPhoto[] }) {
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
          await uploadInspectionPhotoAction({ inspectionId, propertyId, dataUri: reader.result as string });
          toast.show("Photo uploaded.");
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
        const url = await getInspectionPhotoUrlAction(photoId);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not open this photo.");
      }
    });
  }

  function remove(photoId: string) {
    startTransition(async () => {
      await removeInspectionPhotoAction(photoId);
      router.refresh();
    });
  }

  return (
    <div className="mt-3">
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <button type="button" onClick={() => fileInput.current?.click()} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
        <Upload className="h-3.5 w-3.5" /> Upload Photo
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {photos.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-1 rounded-lg border border-border bg-surface p-2.5">
            <button type="button" onClick={() => view(p.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
              <ImageIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate text-xs text-ink">{p.caption || new Date(p.createdAt).toLocaleDateString("en-GB")}</span>
            </button>
            <button type="button" onClick={() => remove(p.id)} disabled={isPending} className="text-muted hover:text-primary">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {photos.length === 0 && <p className="col-span-full text-sm text-muted">No photos uploaded yet.</p>}
      </div>
    </div>
  );
}
