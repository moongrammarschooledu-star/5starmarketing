"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { maintenanceCategories, maintenancePriorities, type MaintenanceCategory, type MaintenancePriority } from "@/lib/models/maintenance";
import { createMaintenanceRequestCustomerAction, uploadMaintenanceRequestPhotoCustomerAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary";

export function NewCustomerMaintenanceRequestForm({ properties }: { properties: { id: string; title: string; unitId?: string }[] }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [category, setCategory] = useState<MaintenanceCategory>("Other");
  const [priority, setPriority] = useState<MaintenancePriority>("NORMAL");
  const [description, setDescription] = useState("");
  const [preferredVisitTime, setPreferredVisitTime] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  function addPhotos(files: FileList) {
    setPhotos((prev) => [...prev, ...Array.from(files)].slice(0, 5));
  }

  function readAsDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function submit() {
    if (!propertyId || !description.trim()) {
      toast.show("Please select a property and describe the issue.");
      return;
    }
    const selected = properties.find((p) => p.id === propertyId);
    startTransition(async () => {
      try {
        const request = await createMaintenanceRequestCustomerAction({
          propertyId,
          unitId: selected?.unitId,
          category,
          priority,
          description: description.trim(),
          preferredVisitTime: preferredVisitTime || undefined,
        });
        for (const file of photos) {
          const dataUri = await readAsDataUri(file);
          await uploadMaintenanceRequestPhotoCustomerAction(request.id, dataUri).catch(() => {});
        }
        toast.show("Request submitted.");
        router.push(`/customer/maintenance/${request.id}`);
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not submit this request.");
      }
    });
  }

  return (
    <div className="max-w-xl space-y-4 rounded-2xl border border-border bg-surface p-5">
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Property</span>
        <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inputClass}>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as MaintenanceCategory)} className={inputClass}>
            {maintenanceCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as MaintenancePriority)} className={inputClass}>
            {maintenancePriorities.filter((p) => p !== "EMERGENCY").map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Describe the Issue</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} min-h-28`} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Preferred Visit Time (optional)</span>
        <input type="datetime-local" value={preferredVisitTime} onChange={(e) => setPreferredVisitTime(e.target.value)} className={inputClass} />
      </label>

      <div>
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Photos (optional, up to 5)</span>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => e.target.files && addPhotos(e.target.files)} />
        <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
          <Upload className="h-3.5 w-3.5" /> Add Photos
        </button>
        {photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((f, i) => (
              <span key={i} className="flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-xs text-ink">
                {f.name}
                <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <button type="button" onClick={submit} disabled={isPending} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {isPending ? "Submitting..." : "Submit Request"}
      </button>
    </div>
  );
}
