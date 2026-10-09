"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ImagePlus, Loader2 } from "lucide-react";
import { PlanSvg } from "./PlanSvg";
import { createHouseDesignFromDataAction, type NewDesignState } from "@/lib/actions/houseDesign.actions";
import { PLOT_PRESETS, floorName } from "@/lib/house/catalog";
import type { DesignData } from "@/lib/house/types";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary";

interface Reading {
  design: DesignData;
  notes: string[];
  warnings: string[];
}

/** Shrinks a photo to a JPEG of at most `maxSide` pixels (phone photos are
 *  huge) and returns it as base64 without the data-URL prefix. */
async function toJpegBase64(file: File, maxSide = 1800): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot prepare the picture.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const q of [0.88, 0.75, 0.6]) {
    const url = canvas.toDataURL("image/jpeg", q);
    const data = url.slice(url.indexOf(",") + 1);
    if (data.length < 1_100_000) return data;
  }
  throw new Error("The picture is too detailed to send. Please take a smaller or clearer photo.");
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function UploadDesignForm({ projects }: { projects: { id: string; label: string }[] }) {
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [plot, setPlot] = useState("5m");
  const [customW, setCustomW] = useState("");
  const [customL, setCustomL] = useState("");
  const [floors, setFloors] = useState(1);
  const [files, setFiles] = useState<(File | null)[]>([null, null, null]);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Reading | null>(null);
  const [saveState, saveAction, saving] = useActionState<NewDesignState, FormData>(createHouseDesignFromDataAction, {});
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const preset = PLOT_PRESETS.find((p) => p.key === plot);
  const width = preset ? preset.width : Number(customW);
  const length = preset ? preset.length : Number(customL);

  async function read() {
    setError(null);
    setResult(null);
    if (!name.trim()) return setError("Please give the design a name.");
    if (!Number.isFinite(width) || !Number.isFinite(length) || width < 10 || length < 10 || width > 400 || length > 400) {
      return setError("Enter the plot width and length in feet (between 10 and 400).");
    }
    const chosen = files.slice(0, floors).filter((f): f is File => f !== null);
    if (chosen.length === 0) return setError("Please choose the picture of your naqsha.");
    if (chosen.length !== floors) return setError(`Please choose a picture for each of the ${floors} floors, or reduce the number of floors.`);

    setReading(true);
    try {
      const images = [];
      for (const f of chosen) images.push({ mediaType: "image/jpeg", data: await toJpegBase64(f) });
      const res = await fetch("/admin/house-designer/trace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plot: { width, length }, floors, images }),
      });
      const body = (await res.json().catch(() => null)) as (Reading & { error?: string }) | null;
      if (!res.ok || !body || body.error) {
        setError(body?.error ?? "The drawing could not be read. Please try again.");
      } else {
        setResult({ design: body.design, notes: body.notes ?? [], warnings: body.warnings ?? [] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The drawing could not be read. Please try again.");
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Design name *">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="e.g. Mr. Ahmed - 5 Marla House" className={inputClass} />
          </Field>
          <Field label="Client">
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} maxLength={120} className={inputClass} />
          </Field>
          <Field label="Plot size" hint="Used to scale the drawing. Sizes written on your drawing are used first.">
            <select value={plot} onChange={(e) => setPlot(e.target.value)} className={inputClass}>
              {PLOT_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Other size (type below)</option>
            </select>
          </Field>
          {plot === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Width (ft)">
                <input value={customW} onChange={(e) => setCustomW(e.target.value)} inputMode="decimal" className={inputClass} />
              </Field>
              <Field label="Length (ft)" hint="Front to back">
                <input value={customL} onChange={(e) => setCustomL(e.target.value)} inputMode="decimal" className={inputClass} />
              </Field>
            </div>
          ) : (
            <Field label="Floors in the drawing">
              <select value={floors} onChange={(e) => setFloors(Number(e.target.value))} className={inputClass}>
                <option value={1}>1 - one picture</option>
                <option value={2}>2 - a picture for each floor</option>
                <option value={3}>3 - a picture for each floor</option>
              </select>
            </Field>
          )}
          {plot === "custom" && (
            <Field label="Floors in the drawing">
              <select value={floors} onChange={(e) => setFloors(Number(e.target.value))} className={inputClass}>
                <option value={1}>1 - one picture</option>
                <option value={2}>2 - a picture for each floor</option>
                <option value={3}>3 - a picture for each floor</option>
              </select>
            </Field>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: floors }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => inputs.current[i]?.click()}
              className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-center text-xs font-bold text-muted hover:border-primary hover:text-primary"
            >
              <ImagePlus className="h-6 w-6" />
              {files[i] ? <span className="max-w-[90%] truncate text-ink">{files[i]!.name}</span> : <span>{floorName(i)} drawing</span>}
              <input
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFiles((prev) => prev.map((p, k) => (k === i ? f : p)));
                  setResult(null);
                }}
              />
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Take a clear photo from straight above (good light, no shadows) or scan the paper. Sizes written on the drawing make the result much more exact. The picture is sent to Claude AI only to read it and is not saved.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void read()} disabled={reading} className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
            {reading && <Loader2 className="h-4 w-4 animate-spin" />}
            {reading ? "Reading your drawing (up to a minute)..." : result ? "Read it again" : "Read my drawing"}
          </button>
          <Link href="/admin/house-designer/new" className="rounded-full border-2 border-ink/15 px-6 py-3 text-sm font-bold text-ink hover:border-ink/30">
            Cancel
          </Link>
        </div>
      </div>

      {result && (
        <form action={saveAction} className="space-y-4 rounded-2xl border border-primary/40 bg-surface p-5 sm:p-6">
          <h2 className="font-heading text-base font-bold text-ink">This is what was read from your drawing</h2>
          <p className="text-xs text-muted">Check it against your paper. You can fix anything in the editor, so a small mistake is fine.</p>
          {saveState?.error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">{saveState.error}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {result.design.floors
              .filter((f) => f.rooms.length > 0)
              .map((f) => (
                <div key={f.id} className="rounded-xl border border-border p-2">
                  <p className="px-1 pb-1 text-xs font-bold text-ink">{f.name}</p>
                  <PlanSvg design={result.design} floor={f} className="block h-auto w-full" />
                </div>
              ))}
          </div>

          {(result.notes.length > 0 || result.warnings.length > 0) && (
            <ul className="list-disc space-y-1 rounded-lg bg-amber-50 py-3 pl-8 pr-3 text-xs text-amber-900">
              {[...result.notes, ...result.warnings].map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}

          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="clientName" value={clientName} />
          <input type="hidden" name="constructionProjectId" value={projectId} />
          <input type="hidden" name="data" value={JSON.stringify(result.design)} />

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
            Construction project (optional)
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass}>
              <option value="">Not linked</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={saving} className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-white disabled:opacity-60">
            {saving ? "Opening..." : "Looks good - open it in the editor"}
          </button>
        </form>
      )}
    </div>
  );
}
