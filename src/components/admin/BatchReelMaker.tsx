"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clapperboard, Copy, Download, Loader2, Square } from "lucide-react";
import { createReelVideo, type ReelData } from "@/lib/reelVideo";
import { site } from "@/lib/site";
import { useToast } from "./ToastProvider";
import { MusicStylePicker, useMusicStyle } from "./MusicStylePicker";

export interface BatchItem {
  brochureId: string;
  serialNo: string;
  slug: string;
  title: string;
  purpose: string;
  price: string;
  location: string;
  /** False while the property only has a stand-in stock photo. */
  hasRealPhoto: boolean;
}

type Status = "waiting" | "making" | "done" | "warn" | "failed";
interface Row {
  status: Status;
  note?: string;
}

// Remembers (in this browser only) which videos were already made, so the next
// session can start with the properties that are still left.
const DONE_KEY = "5star-batch-reels-done-v1";

function readDone(): Set<string> {
  try {
    const raw = window.localStorage.getItem(DONE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function writeDone(done: Set<string>) {
  try {
    window.localStorage.setItem(DONE_KEY, JSON.stringify([...done]));
  } catch {
    /* private window or blocked storage - the list simply is not remembered */
  }
}

function tidy(title: string) {
  return title.replace(/\s+/g, " ").replace(/ ,/g, ",").trim();
}

/** The TikTok caption for one property: details, reference number, contact, link and hashtags. */
export function reelCaption(i: BatchItem): string {
  const rent = i.purpose === "For Rent";
  return [
    tidy(i.title),
    `${rent ? "Rent" : "Price"}: ${i.price}`,
    i.serialNo ? `Ref: ${i.serialNo}` : null,
    `Call/WhatsApp: ${site.phoneDisplay2}`,
    `${site.websiteUrl}/properties/${i.slug}`,
    `#Lahore #${rent ? "PropertyForRent" : "PropertyForSale"} #RealEstate #5STARM`,
  ]
    .filter(Boolean)
    .join("\n");
}

function fileName(i: BatchItem, ext: string) {
  const base = `${i.serialNo || "property"}-${i.slug}`.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 110);
  return `${base}-reel.${ext}`;
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

function saveText(text: string, name: string) {
  saveBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), name);
}

const STATUS_LABEL: Record<Status, string> = { waiting: "Waiting", making: "Making...", done: "Saved", warn: "Saved - check it", failed: "Failed" };
const STATUS_TONE: Record<Status, string> = {
  waiting: "bg-surface-muted text-muted",
  making: "bg-primary/10 text-primary",
  done: "bg-success/10 text-success",
  warn: "bg-amber-500/10 text-amber-700",
  failed: "bg-primary/10 text-primary",
};

export function BatchReelMaker({ items, withoutBrochure }: { items: BatchItem[]; withoutBrochure: number }) {
  const [filter, setFilter] = useState<"all" | "sale" | "rent">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [madeBefore, setMadeBefore] = useState<Set<string>>(new Set());
  const [music, setMusic] = useState(true);
  const [musicStyle, setMusicStyle] = useMusicStyle();
  const [running, setRunning] = useState(false);
  const [fraction, setFraction] = useState(0);
  const [label, setLabel] = useState("");
  const [current, setCurrent] = useState<string | null>(null);
  const [tabHidden, setTabHidden] = useState(false);
  const [doneOrder, setDoneOrder] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const toast = useToast();

  useEffect(() => {
    setMadeBefore(readDone());
  }, []);

  // A video recorded in a hidden tab comes out frozen, so the team is told as soon as the tab is hidden.
  useEffect(() => {
    const check = () => setTabHidden(document.visibilityState === "hidden");
    check();
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, []);

  // Closing or reloading the page mid-run would lose the video being made.
  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const shown = useMemo(
    () => items.filter((i) => (filter === "all" ? true : filter === "sale" ? i.purpose !== "For Rent" : i.purpose === "For Rent")),
    [items, filter]
  );
  const byId = useMemo(() => new Map(items.map((i) => [i.brochureId, i])), [items]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectNext(count: number) {
    const pick = shown.filter((i) => i.hasRealPhoto && !madeBefore.has(i.brochureId) && rows[i.brochureId]?.status !== "done").slice(0, count);
    setSelected(new Set(pick.map((i) => i.brochureId)));
  }

  function setRow(id: string, row: Row) {
    setRows((r) => ({ ...r, [id]: row }));
  }

  async function run() {
    const queue = items.filter((i) => selected.has(i.brochureId));
    if (queue.length === 0 || running) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setRows((r) => {
      const next = { ...r };
      for (const q of queue) next[q.brochureId] = { status: "waiting" };
      return next;
    });

    // Keeps the screen awake so the computer does not go to sleep half way.
    let wake: { release: () => Promise<void> } | null = null;
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
      wake = (await nav.wakeLock?.request("screen")) ?? null;
    } catch {
      wake = null;
    }

    const done = readDone();
    try {
      for (const item of queue) {
        if (controller.signal.aborted) break;
        const id = item.brochureId;
        setCurrent(id);
        setFraction(0);
        setLabel("Loading the property details...");
        setRow(id, { status: "making" });
        try {
          const res = await fetch(`/admin/brochures/reel-data/${id}`, { cache: "no-store", signal: controller.signal });
          if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not load this property's details.");
          const data = (await res.json()) as ReelData;
          const out = await createReelVideo({
            data,
            description: null,
            closing: null,
            music,
            musicStyle,
            signal: controller.signal,
            onProgress: (f, l) => {
              setFraction(f);
              setLabel(l);
            },
          });
          saveBlob(out.blob, fileName(item, out.extension));
          done.add(id);
          writeDone(done);
          setMadeBefore(new Set(done));
          setDoneOrder((o) => (o.includes(id) ? o : [...o, id]));
          setSelected((s) => {
            const next = new Set(s);
            next.delete(id);
            return next;
          });
          setRow(
            id,
            out.pictureUnverified
              ? { status: "warn", note: "The automatic check could not confirm the picture - play the saved file to be sure." }
              : { status: "done" }
          );
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") {
            setRow(id, { status: "waiting", note: "Stopped." });
            break;
          }
          setRow(id, { status: "failed", note: e instanceof Error ? e.message : "Could not make this video." });
        }
      }
    } finally {
      await wake?.release().catch(() => {});
      setRunning(false);
      setCurrent(null);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function copyCaption(item: BatchItem) {
    try {
      await navigator.clipboard.writeText(reelCaption(item));
      toast.show("Caption copied.");
    } catch {
      toast.show("Could not copy - use Download captions instead.");
    }
  }

  function downloadCaptions() {
    const ids = doneOrder.length > 0 ? doneOrder : [...madeBefore];
    const text = ids
      .map((id) => byId.get(id))
      .filter((i): i is BatchItem => Boolean(i))
      .map((i) => `FILE: ${fileName(i, "mp4")}\n\n${reelCaption(i)}`)
      .join("\n\n----------------------------------------\n\n");
    if (!text) {
      toast.show("No videos made yet.");
      return;
    }
    saveText(text, "tiktok-captions.txt");
  }

  const selectedCount = selected.size;
  const madeCount = items.filter((i) => madeBefore.has(i.brochureId)).length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-5 text-sm text-ink">
        <p className="font-bold">Before you start</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>
            <span className="font-semibold text-ink">Keep this tab in front and do not switch tabs</span> until the run finishes. A video made while the tab is hidden comes out frozen.
          </li>
          <li>Each video takes about 2 to 5 minutes. Start with 5 to 10 properties, then do the next batch later.</li>
          <li>Each finished video is saved to your Downloads folder by itself. Chrome may ask once to allow multiple downloads - choose Allow.</li>
          <li>The videos have captions and light background music. There is no spoken voice here.</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "sale", "rent"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            disabled={running}
            className={filter === f ? "rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-white" : "rounded-full border border-border px-4 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted"}
          >
            {f === "all" ? "All" : f === "sale" ? "For Sale" : "For Rent"}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" disabled={running} onClick={() => selectNext(5)} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
          Select next 5
        </button>
        <button type="button" disabled={running} onClick={() => selectNext(10)} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
          Select next 10
        </button>
        <button type="button" disabled={running} onClick={() => setSelected(new Set())} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-bold text-muted hover:text-primary disabled:opacity-50">
          Clear
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink">
            <input type="checkbox" checked={music} onChange={(e) => setMusic(e.target.checked)} disabled={running} className="h-4 w-4 rounded border-border text-primary" />
            Background music
          </label>
          {music && <MusicStylePicker value={musicStyle} onChange={setMusicStyle} disabled={running} />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!running ? (
          <button
            type="button"
            onClick={run}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            <Clapperboard className="h-4 w-4" /> Make {selectedCount} video{selectedCount === 1 ? "" : "s"}
          </button>
        ) : (
          <button type="button" onClick={stop} className="inline-flex items-center gap-2 rounded-full border-2 border-ink/20 px-5 py-2.5 text-xs font-bold text-ink hover:border-primary hover:text-primary">
            <Square className="h-4 w-4" /> Stop after this video
          </button>
        )}
        <button type="button" onClick={downloadCaptions} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-bold text-ink hover:border-primary hover:text-primary">
          <Download className="h-4 w-4" /> Download captions (.txt)
        </button>
        <span className="text-xs text-muted">
          {items.length} properties - {madeCount} made earlier on this computer
          {withoutBrochure > 0 ? ` - ${withoutBrochure} without a brochure are skipped` : ""}
        </span>
      </div>

      {running && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          {tabHidden && (
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
              <AlertTriangle className="h-4 w-4" /> This tab is hidden right now - bring it back to the front, or the video will freeze.
            </p>
          )}
          <p className="text-sm font-semibold text-ink">
            <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin text-primary" />
            {current ? tidy(byId.get(current)?.title ?? "") : ""}
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.round(fraction * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs font-semibold text-muted">
            {label} ({Math.round(fraction * 100)}%)
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">For</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Caption</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No available properties with a brochure here.
                </td>
              </tr>
            )}
            {shown.map((i) => {
              const row = rows[i.brochureId];
              const before = madeBefore.has(i.brochureId);
              return (
                <tr key={i.brochureId} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(i.brochureId)}
                      onChange={() => toggle(i.brochureId)}
                      disabled={running}
                      aria-label={`Select ${i.title}`}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                  </td>
                  <td className="max-w-[360px] px-4 py-3">
                    <span className="line-clamp-2 font-semibold text-ink">{tidy(i.title)}</span>
                    <span className="font-mono text-[11px] font-bold text-muted">{i.serialNo}</span>
                    {!i.hasRealPhoto && <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">stock photo only</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{i.purpose.replace("For ", "")}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-primary">{i.price}</td>
                  <td className="px-4 py-3">
                    {row ? (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
                    ) : before ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Made earlier
                      </span>
                    ) : (
                      <span className="text-xs text-muted">-</span>
                    )}
                    {row?.note && <p className="mt-1 max-w-[260px] text-[11px] font-semibold text-muted">{row.note}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => copyCaption(i)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary">
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
