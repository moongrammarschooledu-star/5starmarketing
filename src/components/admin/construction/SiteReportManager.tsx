"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp, Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import type { ConstructionSiteReport, ConstructionSiteReportInput, ConstructionSiteMedia, SiteMediaType } from "@/lib/models/construction";
import { createSiteReportAction, uploadSiteMediaAction, getSiteMediaUrlAction, setSiteMediaCustomerVisibleAction, removeSiteMediaAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";
const MAX_BYTES = 15 * 1024 * 1024;

export function SiteReportManager({ projectId, reports, media }: { projectId: string; reports: ConstructionSiteReport[]; media: ConstructionSiteMedia[] }) {
  return (
    <div className="mt-3 space-y-8">
      <section>
        <NewSiteReportForm projectId={projectId} />
        <div className="mt-4 space-y-2">
          {reports.map((r) => (
            <ReportRow key={r.id} report={r} />
          ))}
          {reports.length === 0 && <p className="text-sm text-muted">No site reports recorded yet.</p>}
        </div>
      </section>

      <section>
        <h3 className="font-heading text-base font-bold text-ink">Site Photos &amp; Videos</h3>
        <MediaUploadForm projectId={projectId} />
        <MediaGallery projectId={projectId} media={media} />
      </section>
    </div>
  );
}

function NewSiteReportForm({ projectId }: { projectId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<ConstructionSiteReportInput>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof ConstructionSiteReportInput>(key: K, value: ConstructionSiteReportInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    startTransition(async () => {
      try {
        await createSiteReportAction(projectId, form as ConstructionSiteReportInput);
        toast.show("Site report recorded.");
        setForm({});
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this report.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="font-heading text-base font-bold text-ink">New Daily Site Report</span>
        {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
      </button>
      {showForm && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input type="date" value={form.reportDate ?? ""} onChange={(e) => set("reportDate", e.target.value)} className={inputClass} />
            <input placeholder="Weather" value={form.weather ?? ""} onChange={(e) => set("weather", e.target.value)} className={inputClass} />
            <input type="number" placeholder="Workers Present" value={form.workersPresent ?? ""} onChange={(e) => set("workersPresent", Number(e.target.value))} className={inputClass} />
            <input placeholder="Contractors Present" value={form.contractorsPresent ?? ""} onChange={(e) => set("contractorsPresent", e.target.value)} className={`${inputClass} sm:col-span-2`} />
            <textarea placeholder="Work Completed Today" value={form.workCompleted ?? ""} onChange={(e) => set("workCompleted", e.target.value)} className={`${inputClass} min-h-16 sm:col-span-3`} />
            <textarea placeholder="Work Planned for Tomorrow" value={form.workPlanned ?? ""} onChange={(e) => set("workPlanned", e.target.value)} className={`${inputClass} min-h-16 sm:col-span-3`} />
            <input placeholder="Materials Received" value={form.materialsReceived ?? ""} onChange={(e) => set("materialsReceived", e.target.value)} className={inputClass} />
            <input placeholder="Equipment Used" value={form.equipmentUsed ?? ""} onChange={(e) => set("equipmentUsed", e.target.value)} className={inputClass} />
            <input placeholder="Visitors" value={form.visitors ?? ""} onChange={(e) => set("visitors", e.target.value)} className={inputClass} />
            <textarea placeholder="Issues" value={form.issues ?? ""} onChange={(e) => set("issues", e.target.value)} className={`${inputClass} min-h-14 sm:col-span-3`} />
            <textarea placeholder="Safety Incidents" value={form.safetyIncidents ?? ""} onChange={(e) => set("safetyIncidents", e.target.value)} className={`${inputClass} min-h-14 sm:col-span-3`} />
            <textarea placeholder="Delays" value={form.delays ?? ""} onChange={(e) => set("delays", e.target.value)} className={`${inputClass} min-h-14 sm:col-span-3`} />
          </div>
          <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Record Report
          </button>
        </div>
      )}
    </div>
  );
}

function ReportRow({ report }: { report: ConstructionSiteReport }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between text-left">
        <div>
          <p className="text-sm font-bold text-ink">
            {report.reportNumber} — {new Date(report.reportDate).toLocaleDateString("en-GB")}
          </p>
          <p className="text-xs text-muted">
            {report.weather ? `${report.weather} · ` : ""}
            {report.workersPresent != null ? `${report.workersPresent} workers` : ""} {report.siteManagerName ? `· ${report.siteManagerName}` : ""}
          </p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
      </button>
      {expanded && (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs text-muted">
          {report.contractorsPresent && <p><span className="font-semibold text-ink">Contractors: </span>{report.contractorsPresent}</p>}
          {report.workCompleted && <p><span className="font-semibold text-ink">Completed: </span>{report.workCompleted}</p>}
          {report.workPlanned && <p><span className="font-semibold text-ink">Planned: </span>{report.workPlanned}</p>}
          {report.materialsReceived && <p><span className="font-semibold text-ink">Materials: </span>{report.materialsReceived}</p>}
          {report.equipmentUsed && <p><span className="font-semibold text-ink">Equipment: </span>{report.equipmentUsed}</p>}
          {report.visitors && <p><span className="font-semibold text-ink">Visitors: </span>{report.visitors}</p>}
          {report.issues && <p><span className="font-semibold text-ink">Issues: </span>{report.issues}</p>}
          {report.safetyIncidents && <p><span className="font-semibold text-ink">Safety: </span>{report.safetyIncidents}</p>}
          {report.delays && <p><span className="font-semibold text-ink">Delays: </span>{report.delays}</p>}
          {report.notes && <p><span className="font-semibold text-ink">Notes: </span>{report.notes}</p>}
        </div>
      )}
    </div>
  );
}

function MediaUploadForm({ projectId }: { projectId: string }) {
  const [mediaType, setMediaType] = useState<SiteMediaType>("PHOTO");
  const [caption, setCaption] = useState("");
  const [customerVisible, setCustomerVisible] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  function pickFile(f: File) {
    if (f.size > MAX_BYTES) {
      toast.show("File is larger than 15MB.");
      return;
    }
    setFile(f);
    setMediaType(f.type.startsWith("video/") ? "VIDEO" : "PHOTO");
  }

  function upload() {
    if (!file) {
      toast.show("Please choose a photo or video to upload.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      startTransition(async () => {
        try {
          await uploadSiteMediaAction({ projectId, mediaType, dataUri: reader.result as string, caption: caption || undefined, customerVisible });
          toast.show("File uploaded.");
          setFile(null);
          setCaption("");
          setCustomerVisible(false);
          router.refresh();
        } catch (e) {
          toast.show(e instanceof Error ? e.message : "Could not upload this file.");
        }
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="mt-2 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,video/mp4" className="hidden" onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
        <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold text-ink hover:bg-surface-muted">
          <Upload className="h-3.5 w-3.5" /> Choose File
        </button>
        {file && <span className="text-xs text-muted">{file.name}</span>}
        <input placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} className={`${inputClass} w-56`} />
        <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <input type="checkbox" checked={customerVisible} onChange={(e) => setCustomerVisible(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
          Visible to customer
        </label>
        <button type="button" onClick={upload} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          Upload
        </button>
      </div>
    </div>
  );
}

function MediaGallery({ projectId, media }: { projectId: string; media: ConstructionSiteMedia[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
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

  function toggleVisible(mediaId: string, visible: boolean) {
    startTransition(async () => {
      await setSiteMediaCustomerVisibleAction(mediaId, projectId, visible);
      router.refresh();
    });
  }

  function remove(mediaId: string) {
    startTransition(async () => {
      await removeSiteMediaAction(mediaId, projectId);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {media.map((m) => (
        <div key={m.id} className="rounded-xl border border-border bg-surface p-3">
          <button type="button" onClick={() => view(m.id)} disabled={isPending} className="flex h-20 w-full items-center justify-center rounded-lg bg-surface-muted text-muted hover:text-primary">
            <ImageIcon className="h-6 w-6" />
          </button>
          {m.caption && <p className="mt-1.5 truncate text-[11px] text-muted">{m.caption}</p>}
          <div className="mt-1.5 flex items-center justify-between">
            <label className="flex items-center gap-1 text-[10px] font-semibold text-ink">
              <input type="checkbox" checked={m.customerVisible} onChange={(e) => toggleVisible(m.id, e.target.checked)} disabled={isPending} className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary" />
              Customer
            </label>
            <button type="button" onClick={() => remove(m.id)} disabled={isPending} className="text-muted hover:text-primary">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
      {media.length === 0 && <p className="col-span-full text-sm text-muted">No site photos or videos uploaded yet.</p>}
    </div>
  );
}
