"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle, CheckCircle2, XCircle, Copy } from "lucide-react";
import type { InventoryImportValidationResult } from "@/lib/models/inventory";
import { previewInventoryImportAction, bulkImportInventoryAction } from "@/lib/actions/inventory.actions";
import { useToast } from "@/components/admin/ToastProvider";

const SAMPLE_CSV = `Project,Block,Building,Floor,Unit Number,Type,Area,Area Unit,Price,Status
Green Valley,A,,,A-101,Flat,1200,Sq Ft,8500000,AVAILABLE
Green Valley,A,,,A-102,Flat,1200,Sq Ft,8500000,AVAILABLE
,,,,Plot-101,Residential Plot,5,Marla,6000000,AVAILABLE`;

export function InventoryBulkImport() {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<InventoryImportValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setCsvText(reader.result);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function runPreview() {
    setError(null);
    setImportedCount(null);
    if (!csvText.trim()) {
      setError("Paste or upload a CSV file first.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await previewInventoryImportAction(csvText);
        setPreview(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read this CSV file.");
      }
    });
  }

  function confirmImport() {
    if (!preview || preview.valid.length === 0) return;
    startTransition(async () => {
      try {
        const count = await bulkImportInventoryAction(
          preview.valid.map((r) => ({
            unitNumber: r.unitNumber,
            unitType: r.unitType,
            projectId: r.projectId,
            block: r.block,
            building: r.building,
            floor: r.floor,
            area: r.area ? Number(r.area) : undefined,
            areaUnit: r.areaUnit,
            price: r.price ? Number(r.price) : undefined,
            status: r.status,
          }))
        );
        setImportedCount(count);
        setPreview(null);
        setCsvText("");
        toast.show(`${count} unit(s) imported.`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not import inventory.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">1. Upload CSV</h2>
        <p className="mt-1 text-xs text-muted">
          Columns: Project, Block, Building, Floor, Unit Number*, Type*, Area, Area Unit, Price, Status. Only Unit Number and Type are required.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
          <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
            <Upload className="h-3.5 w-3.5" /> Choose CSV File
          </button>
          <button type="button" onClick={() => setCsvText(SAMPLE_CSV)} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-primary hover:underline">
            <Copy className="h-3.5 w-3.5" /> Use Sample Format
          </button>
        </div>

        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={8}
          placeholder="Paste CSV content here, or upload a file above."
          className="mt-3 w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 font-mono text-xs text-ink outline-none focus:border-primary"
        />

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
          </div>
        )}
        {importedCount !== null && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> {importedCount} unit(s) imported successfully.
          </div>
        )}

        <button type="button" onClick={runPreview} disabled={isPending} className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {isPending ? "Checking..." : "Preview Import"}
        </button>
      </div>

      {preview && (
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-heading text-base font-bold text-ink">2. Review</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-center">
              <div className="text-2xl font-extrabold text-success">{preview.valid.length}</div>
              <div className="text-xs font-bold text-success">Valid Rows</div>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center">
              <div className="text-2xl font-extrabold text-primary">{preview.invalid.length}</div>
              <div className="text-xs font-bold text-primary">Invalid Rows</div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
              <div className="text-2xl font-extrabold text-amber-600">{preview.duplicates.length}</div>
              <div className="text-xs font-bold text-amber-600">Duplicate Rows</div>
            </div>
          </div>

          {preview.invalid.length > 0 && (
            <div className="mt-4">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                <XCircle className="h-3.5 w-3.5" /> Invalid Rows
              </h3>
              <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                {preview.invalid.map((item, i) => (
                  <div key={i} className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-ink">
                    Row {item.row.rowNumber} ({item.row.unitNumber || "no unit number"}): {item.errors.join(" ")}
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.duplicates.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-amber-600">Duplicate Rows (skipped)</h3>
              <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                {preview.duplicates.map((item, i) => (
                  <div key={i} className="rounded-lg bg-amber-500/5 px-3 py-2 text-xs text-ink">
                    Row {item.row.rowNumber} ({item.row.unitNumber}): {item.reason}
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.valid.length > 0 ? (
            <button type="button" onClick={confirmImport} disabled={isPending} className="mt-4 rounded-full bg-success px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {isPending ? "Importing..." : `Confirm Import (${preview.valid.length} rows)`}
            </button>
          ) : (
            <p className="mt-4 text-sm text-muted">No valid rows to import — fix the errors above and try again.</p>
          )}
        </div>
      )}
    </div>
  );
}
