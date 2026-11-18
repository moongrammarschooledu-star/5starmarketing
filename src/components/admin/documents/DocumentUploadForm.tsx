"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle, CheckCircle2, FileText, Camera, X, Loader2 } from "lucide-react";
import type { DocumentTarget, DocumentType, DocumentVisibility } from "@/lib/models/document";
import { prepareDocumentUploadAction, finalizeDocumentUploadAction, abortDocumentUploadAction } from "@/lib/actions/documents.actions";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/admin/ToastProvider";
import { RecordPicker } from "@/components/admin/documents/RecordPicker";

const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ACCEPT = ALLOWED.join(",");
const MAX_BYTES = 15 * 1024 * 1024;
const BUCKET = "secure-documents";
/** Photos bigger than this are shrunk in the browser first (a phone photo is often 5-10 MB). */
const SHRINK_ABOVE = 1.5 * 1024 * 1024;
const MAX_SIDE = 2400;

const VISIBILITY_LABELS: Record<DocumentVisibility, string> = {
  ADMIN_ONLY: "Admin only (private)",
  AGENT_ONLY: "Agent only",
  CUSTOMER_ONLY: "Customer only",
  ADMIN_AGENT: "Admin + Agent",
  ADMIN_CUSTOMER: "Admin + Customer (the customer can see it)",
  ALL_AUTHORIZED: "Everyone authorised",
};
const VISIBILITY_ORDER: DocumentVisibility[] = ["ADMIN_ONLY", "ADMIN_AGENT", "ADMIN_CUSTOMER", "AGENT_ONLY", "CUSTOMER_ONLY", "ALL_AUTHORIZED"];

type Row = { key: string; file: File; title: string; state: "queued" | "uploading" | "done" | "error"; message?: string };

/** Shrinks a big photo to a sensible size (JPEG, longest side 2400px). Returns the original on any problem. */
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= SHRINK_ABOVE) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function sha256Hex(file: File): Promise<string | undefined> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return undefined;
  }
}

export function DocumentUploadForm({
  types,
  deals,
  properties,
  projects,
  defaultDealId,
  defaultCustomerId,
  defaultPropertyId,
  defaultProjectId,
  defaultTargets,
}: {
  types: DocumentType[];
  deals: { id: string; dealNumber: string; customerId?: string; propertyId?: string; projectId?: string }[];
  properties: { id: string; title: string }[];
  projects: { id: string; name: string }[];
  defaultDealId?: string;
  defaultCustomerId?: string;
  defaultPropertyId?: string;
  defaultProjectId?: string;
  /** Records the document should already be attached to (e.g. when opened from a contact). */
  defaultTargets?: { contact?: DocumentTarget; customer?: DocumentTarget; lead?: DocumentTarget; lease?: DocumentTarget };
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [documentType, setDocumentType] = useState(types[0]?.code ?? "OTHER");
  const [dealId, setDealId] = useState(defaultDealId ?? "");
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? "");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [contact, setContact] = useState<DocumentTarget | null>(defaultTargets?.contact ?? null);
  const [lead, setLead] = useState<DocumentTarget | null>(defaultTargets?.lead ?? null);
  const [lease, setLease] = useState<DocumentTarget | null>(defaultTargets?.lease ?? null);
  const [customer, setCustomer] = useState<DocumentTarget | null>(defaultTargets?.customer ?? null);
  const [visibility, setVisibility] = useState<DocumentVisibility>(defaultDealId || defaultCustomerId || defaultTargets?.customer ? "ADMIN_CUSTOMER" : "ADMIN_ONLY");
  const [expiresAt, setExpiresAt] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  const selectedType = types.find((t) => t.code === documentType);
  const needsExpiry = !!selectedType?.requiresExpiry;
  const categories = Array.from(new Set(types.map((t) => t.category)));

  async function addFiles(list: FileList | File[]) {
    setError(null);
    const added: Row[] = [];
    for (const original of Array.from(list)) {
      if (!ALLOWED.includes(original.type)) {
        setError(`"${original.name}" is not allowed. Use PDF, JPG, PNG or WEBP.`);
        continue;
      }
      const file = await shrinkImage(original);
      if (file.size > MAX_BYTES) {
        setError(`"${original.name}" is larger than 15MB.`);
        continue;
      }
      added.push({ key: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, title: original.name.replace(/\.[^.]+$/, ""), state: "queued" });
    }
    if (added.length) setRows((r) => [...r.filter((x) => x.state !== "done"), ...added]);
  }

  function patchRow(key: string, patch: Partial<Row>) {
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function uploadOne(row: Row) {
    const selectedDeal = deals.find((d) => d.id === dealId);
    patchRow(row.key, { state: "uploading", message: undefined });
    let documentId: string | undefined;
    try {
      const prepared = await prepareDocumentUploadAction({
        title: row.title.trim(),
        documentType,
        dealId: dealId || undefined,
        customerId: defaultCustomerId ?? customer?.id ?? selectedDeal?.customerId,
        customerContactId: contact?.id,
        leadId: lead?.id,
        leaseId: lease?.id,
        propertyId: propertyId || selectedDeal?.propertyId || undefined,
        projectId: projectId || selectedDeal?.projectId || undefined,
        visibility,
        expiresAt: expiresAt || undefined,
        fileName: row.file.name,
        mimeType: row.file.type,
        fileSize: row.file.size,
      });
      documentId = prepared.documentId;
      const { error: uploadError } = await createClient().storage.from(BUCKET).upload(prepared.path, row.file, { contentType: row.file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message || "The file could not be uploaded.");
      await finalizeDocumentUploadAction(prepared.documentId, await sha256Hex(row.file));
      patchRow(row.key, { state: "done", message: undefined });
      return true;
    } catch (e) {
      if (documentId) await abortDocumentUploadAction(documentId).catch(() => {});
      patchRow(row.key, { state: "error", message: e instanceof Error ? e.message : "Could not upload this file." });
      return false;
    }
  }

  async function submit() {
    setError(null);
    const todo = rows.filter((r) => r.state === "queued" || r.state === "error");
    if (todo.length === 0) return setError("Please choose a file first.");
    if (todo.some((r) => !r.title.trim())) return setError("Every file needs a title.");
    if (needsExpiry && !expiresAt) return setError("This document type needs an expiry date.");
    setBusy(true);
    let ok = 0;
    for (const row of todo) {
      if (await uploadOne(row)) ok++;
    }
    setBusy(false);
    if (ok > 0) {
      toast.show(ok === 1 ? "Document uploaded." : `${ok} documents uploaded.`);
      router.refresh();
    }
    if (ok < todo.length) setError(`${todo.length - ok} file(s) did not upload. Fix the message shown and press Upload again.`);
  }

  const pending = rows.filter((r) => r.state !== "done").length;
  const allDone = rows.length > 0 && pending === 0;
  const showDeals = !defaultDealId && deals.length > 0;
  const showProperties = !defaultPropertyId && properties.length > 0;
  const showProjects = !defaultProjectId && projects.length > 0;
  const fieldClass = "rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary";

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInput.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
      >
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-bold text-ink">Drag &amp; drop files, or click to choose (you can pick many)</p>
        <p className="text-xs text-muted">PDF, JPG, PNG or WEBP - up to 15MB each. Big photos are made smaller automatically.</p>
      </div>

      <div>
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button type="button" onClick={() => cameraInput.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
          <Camera className="h-4 w-4" /> Take a photo (phone camera)
        </button>
      </div>

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 py-2">
              <FileText className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <input
                  value={r.title}
                  onChange={(e) => patchRow(r.key, { title: e.target.value })}
                  disabled={busy || r.state === "done"}
                  aria-label="Document title"
                  className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-ink outline-none focus:border-primary disabled:opacity-70"
                />
                <p className="px-1 text-[11px] text-muted">
                  {r.file.name} - {(r.file.size / 1024 / 1024).toFixed(2)} MB
                  {r.message ? <span className="ml-2 font-semibold text-primary">{r.message}</span> : null}
                </p>
              </div>
              {r.state === "uploading" && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" />}
              {r.state === "done" && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
              {r.state !== "uploading" && r.state !== "done" && !busy && (
                <button type="button" onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))} aria-label="Remove file" className="shrink-0 rounded-full p-1 text-muted hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Document Type *</span>
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className={fieldClass}>
            {categories.map((c) => (
              <optgroup key={c} label={c}>
                {types
                  .filter((t) => t.category === c)
                  .map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Who can see it</span>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as DocumentVisibility)} className={fieldClass}>
            {VISIBILITY_ORDER.map((v) => (
              <option key={v} value={v}>
                {VISIBILITY_LABELS[v]}
              </option>
            ))}
          </select>
        </label>

        <RecordPicker kind="contact" label="Customer / owner (from Customer Contacts)" value={contact} onChange={setContact} />
        <RecordPicker kind="lead" label="Lead" value={lead} onChange={setLead} />
        <RecordPicker kind="lease" label="Rental lease" value={lease} onChange={setLease} placeholder="Type the lease number..." />
        {!defaultCustomerId && <RecordPicker kind="customer" label="Customer with a portal account" value={customer} onChange={setCustomer} />}

        {showDeals && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Deal</span>
            <select value={dealId} onChange={(e) => setDealId(e.target.value)} className={fieldClass}>
              <option value="">None</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.dealNumber}
                </option>
              ))}
            </select>
          </label>
        )}
        {showProperties && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Property</span>
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={fieldClass}>
              <option value="">None</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {showProjects && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Project</span>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={fieldClass}>
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Expiry date {needsExpiry ? "*" : "(if it has one)"}</span>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={fieldClass} />
          <span className="text-[11px] text-muted">You get an email before it expires.</span>
        </label>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
        </div>
      )}
      {allDone && !error && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> {rows.length === 1 ? "Document uploaded successfully." : `All ${rows.length} documents uploaded successfully.`}
        </div>
      )}

      <button type="button" onClick={submit} disabled={busy || pending === 0} className="w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary-hover disabled:opacity-60">
        {busy ? "Uploading..." : pending > 1 ? `Upload ${pending} Documents` : "Upload Document"}
      </button>
    </div>
  );
}
