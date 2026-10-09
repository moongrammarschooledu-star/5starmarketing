"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Box, Copy, Download, FileText, Grid3x3, Layers, Wand2, LayoutPanelTop, Printer, Redo2, Save, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { PlanEditorCanvas } from "./PlanEditorCanvas";
import { AutoPlanFields, type AutoCounts } from "./AutoPlanFields";
import { DEFAULT_AUTO_SPEC, generateDesign } from "@/lib/house/autoLayout";
import { ElevationSvg } from "./ElevationSvg";
import { House3DView } from "./House3DView";
import { saveHouseDesignAction } from "@/lib/actions/houseDesign.actions";
import {
  OPENING_KIND_ORDER,
  OPENING_SPECS,
  ROOM_SPECS,
  ROOM_TYPE_ORDER,
  floorName,
  newId,
  newRoom,
} from "@/lib/house/catalog";
import { buildSchedule, cloneRooms, designWarnings, roomArea } from "@/lib/house/geometry";
import { VIEW_LABELS } from "@/lib/house/elevation";
import { downloadSvgAsPng, downloadUrl, safeFileName } from "@/lib/house/exportImage";
import type { DesignData, HouseDesign, Opening, OpeningKind, Room, RoomType, Side, ViewName } from "@/lib/house/types";

type Tab = "plan" | "3d" | "elevation" | "details";

const inputClass = "w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-primary";
const smallBtn = "flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:border-primary disabled:opacity-40";

const round = (n: number) => Math.round(n * 100) / 100;

function NumberField({ label, value, onCommit, min, max }: { label: string; value: number; onCommit: (n: number) => void; min: number; max: number }) {
  const [text, setText] = useState(String(round(value)));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(round(value)));
  }, [value, focused]);
  const commit = () => {
    const n = parseFloat(text);
    if (Number.isFinite(n)) onCommit(Math.min(max, Math.max(min, n)));
    else setText(String(round(value)));
  };
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
      {label}
      <input
        value={text}
        inputMode="decimal"
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={inputClass}
      />
    </label>
  );
}

function findFreeSpot(rooms: Room[], w: number, h: number, plotW: number, plotL: number): { x: number; y: number } {
  const fits = (x: number, y: number) =>
    x + w <= plotW + 0.001 && y + h <= plotL + 0.001 && rooms.every((r) => x >= r.x + r.w - 0.001 || x + w <= r.x + 0.001 || y >= r.y + r.h - 0.001 || y + h <= r.y + 0.001);
  for (let y = 0; y <= plotL - h; y += 1) for (let x = 0; x <= plotW - w; x += 1) if (fits(x, y)) return { x, y };
  return { x: 0, y: 0 };
}

export function HouseDesignerEditor({ design, projects, startMix = false }: { design: HouseDesign; projects: { id: string; label: string }[]; startMix?: boolean }) {
  // ---- the drawing, with undo / redo ----
  const [data, setData] = useState<DesignData>(design.data);
  const dataRef = useRef(data);
  const pastRef = useRef<DesignData[]>([]);
  const futureRef = useRef<DesignData[]>([]);
  const dragBeforeRef = useRef<DesignData | null>(null);
  const [historyCount, setHistoryCount] = useState({ past: 0, future: 0 });

  const apply = useCallback((next: DesignData) => {
    dataRef.current = next;
    setData(next);
  }, []);
  const syncCounts = () => setHistoryCount({ past: pastRef.current.length, future: futureRef.current.length });
  const checkpoint = (before: DesignData) => {
    pastRef.current.push(before);
    if (pastRef.current.length > 80) pastRef.current.shift();
    futureRef.current = [];
    syncCounts();
  };
  const edit = (fn: (draft: DesignData) => void) => {
    const before = dataRef.current;
    const next = structuredClone(before);
    fn(next);
    checkpoint(before);
    apply(next);
  };
  const undo = () => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(dataRef.current);
    apply(prev);
    syncCounts();
  };
  const redo = () => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(dataRef.current);
    apply(next);
    syncCounts();
  };

  // ---- everything else ----
  const [name, setName] = useState(design.name);
  const [clientName, setClientName] = useState(design.clientName ?? "");
  const [notes, setNotes] = useState(design.notes ?? "");
  const [projectId, setProjectId] = useState(design.constructionProjectId ?? "");
  const [tab, setTab] = useState<Tab>("plan");
  const [floorIndex, setFloorIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snap, setSnap] = useState(0.5);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<ViewName>("front");
  const [floorsShown, setFloorsShown] = useState(design.data.floors.length);
  const [showRoof, setShowRoof] = useState(true);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoCounts, setAutoCounts] = useState<AutoCounts>(() => {
    const { width, length, floors, floorHeight, ...counts } = DEFAULT_AUTO_SPEC;
    void width;
    void length;
    void floors;
    void floorHeight;
    return counts;
  });
  const [autoNotes, setAutoNotes] = useState<string[]>([]);
  const [mixTip, setMixTip] = useState(startMix);

  const planSvgRef = useRef<SVGSVGElement | null>(null);
  const elevSvgRef = useRef<SVGSVGElement | null>(null);
  const captureRef = useRef<(() => string | null) | null>(null);
  const onCapture = useCallback((fn: (() => string | null) | null) => {
    captureRef.current = fn;
  }, []);

  const savedSnapshot = useRef(JSON.stringify({ name: design.name, clientName: design.clientName ?? "", notes: design.notes ?? "", projectId: design.constructionProjectId ?? "", data: design.data }));
  const currentSnapshot = JSON.stringify({ name, clientName, notes, projectId, data });
  const dirty = currentSnapshot !== savedSnapshot.current;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const floor = data.floors[Math.min(floorIndex, data.floors.length - 1)];
  const fi = data.floors.indexOf(floor);
  const selected = floor.rooms.find((r) => r.id === selectedId) ?? null;
  const warnings = useMemo(() => designWarnings(data), [data]);
  const schedule = useMemo(() => buildSchedule(data), [data]);

  const save = async (): Promise<boolean> => {
    setSaving(true);
    setStatus(null);
    let result: Awaited<ReturnType<typeof saveHouseDesignAction>>;
    try {
      result = await saveHouseDesignAction(design.id, { name, clientName, notes, constructionProjectId: projectId, data });
    } catch {
      // The request itself failed (connection dropped); the server may or may not have saved.
      setSaving(false);
      setStatus({ kind: "error", text: "The connection dropped while saving. Please press Save again." });
      return false;
    }
    setSaving(false);
    if (!result.ok) {
      setStatus({ kind: "error", text: result.error ?? "Could not save." });
      return false;
    }
    savedSnapshot.current = currentSnapshot;
    setStatus({ kind: "ok", text: "Saved" });
    return true;
  };

  // ---- room helpers ----
  const patchRoom = useCallback(
    (roomId: string, patch: Partial<Room>) => {
      const next = structuredClone(dataRef.current);
      const target = next.floors[fi]?.rooms.find((r) => r.id === roomId);
      if (!target) return;
      Object.assign(target, patch);
      apply(next);
    },
    [apply, fi]
  );

  const addRoom = (type: RoomType) => {
    const spec = ROOM_SPECS[type];
    const spot = findFreeSpot(floor.rooms, spec.w, spec.h, data.plot.width, data.plot.length);
    const room = newRoom(type, spot.x, spot.y);
    edit((d) => d.floors[fi].rooms.push(room));
    setSelectedId(room.id);
  };

  const removeSelected = () => {
    if (!selected) return;
    edit((d) => {
      d.floors[fi].rooms = d.floors[fi].rooms.filter((r) => r.id !== selected.id);
    });
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const copy: Room = { ...structuredClone(selected), id: newId("r"), x: Math.min(selected.x + 1, data.plot.width - selected.w), y: Math.min(selected.y + 1, data.plot.length - selected.h) };
    copy.openings = copy.openings.map((o) => ({ ...o, id: newId("o") }));
    edit((d) => d.floors[fi].rooms.push(copy));
    setSelectedId(copy.id);
  };

  const editSelected = (fn: (r: Room) => void) => {
    if (!selected) return;
    edit((d) => {
      const r = d.floors[fi].rooms.find((x) => x.id === selected.id);
      if (r) fn(r);
    });
  };

  const addOpening = (kind: OpeningKind) => {
    editSelected((r) => {
      const width = OPENING_SPECS[kind].width;
      const side: Side = kind === "main_door" ? "bottom" : "top";
      const edge = side === "top" || side === "bottom" ? r.w : r.h;
      r.openings.push({ id: newId("o"), kind, side, offset: round(Math.max(0, (edge - width) / 2)), width });
    });
  };

  const patchOpening = (id: string, patch: Partial<Opening>) => {
    editSelected((r) => {
      const o = r.openings.find((x) => x.id === id);
      if (o) Object.assign(o, patch);
    });
  };

  // ---- automatic plan ----
  const runAutoPlan = () => {
    const hasRooms = dataRef.current.floors.some((f) => f.rooms.length > 0);
    if (hasRooms && !confirm("This replaces every room on every floor with a new automatic plan. You can undo it with Ctrl+Z. Continue?")) return;
    const current = dataRef.current;
    const result = generateDesign({ ...autoCounts, width: current.plot.width, length: current.plot.length, floors: current.floors.length, floorHeight: current.floorHeight });
    setAutoNotes(result.notes);
    if (result.design.floors[0].rooms.length === 0) return;
    edit((d) => {
      d.floors.forEach((f, i) => {
        f.rooms = result.design.floors[i]?.rooms ?? [];
      });
    });
    setSelectedId(null);
    setFloorIndex(0);
  };

  // ---- floors ----
  const addFloor = () => {
    if (data.floors.length >= 4) return;
    edit((d) => d.floors.push({ id: newId("f"), name: floorName(d.floors.length), rooms: [] }));
    setFloorIndex(data.floors.length);
    setFloorsShown(data.floors.length + 1);
  };
  const removeFloor = () => {
    if (data.floors.length <= 1 || fi !== data.floors.length - 1) return;
    if (floor.rooms.length > 0 && !confirm(`Remove "${floor.name}" and all its rooms?`)) return;
    edit((d) => d.floors.pop());
    setFloorIndex(Math.max(0, data.floors.length - 2));
    setFloorsShown((n) => Math.min(n, data.floors.length - 1));
    setSelectedId(null);
  };
  const copyFromBelow = () => {
    if (fi === 0) return;
    if (floor.rooms.length > 0 && !confirm(`Replace the rooms of "${floor.name}" with a copy of "${data.floors[fi - 1].name}"?`)) return;
    edit((d) => {
      d.floors[fi].rooms = cloneRooms(d.floors[fi - 1].rooms).filter((r) => !ROOM_SPECS[r.type].open || r.type === "balcony");
    });
    setSelectedId(null);
  };

  // ---- keyboard ----
  const onKeyDown = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName)) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if (mod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
    } else if (mod && e.key.toLowerCase() === "d") {
      e.preventDefault();
      duplicateSelected();
    } else if (mod && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void save();
    } else if ((e.key === "Delete" || e.key === "Backspace") && selected) {
      e.preventDefault();
      removeSelected();
    } else if (selected && e.key.startsWith("Arrow")) {
      e.preventDefault();
      const step = e.shiftKey ? 5 : snap;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      editSelected((r) => {
        r.x = round(Math.min(Math.max(0, r.x + dx), Math.max(0, data.plot.width - r.w)));
        r.y = round(Math.min(Math.max(0, r.y + dy), Math.max(0, data.plot.length - r.h)));
      });
    }
  };

  const downloadPlan = async () => {
    if (planSvgRef.current) await downloadSvgAsPng(planSvgRef.current, `${safeFileName(name)}-${safeFileName(floor.name)}-plan.png`);
  };
  const downloadElevation = async () => {
    if (elevSvgRef.current) await downloadSvgAsPng(elevSvgRef.current, `${safeFileName(name)}-${view}-elevation.png`, 2000);
  };
  const download3d = () => {
    const url = captureRef.current?.();
    if (url) downloadUrl(url, `${safeFileName(name)}-3d.png`);
  };
  const printSheet = async () => {
    const w = window.open("", "_blank");
    if (dirty && !(await save())) {
      w?.close();
      return;
    }
    if (w) w.location.href = `/admin/house-print/${design.id}`;
  };

  const tabs: { key: Tab; label: string; icon: typeof Box }[] = [
    { key: "plan", label: "Floor Plan", icon: LayoutPanelTop },
    { key: "3d", label: "3D View", icon: Box },
    { key: "elevation", label: "Elevation", icon: Layers },
    { key: "details", label: "Details & Print", icon: FileText },
  ];

  return (
    <div onKeyDown={onKeyDown} tabIndex={-1} className="outline-none">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/house-designer" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink hover:border-primary" aria-label="Back to designs">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} aria-label="Design name" className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 font-heading text-xl font-extrabold text-ink outline-none hover:border-border focus:border-primary" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={undo} disabled={historyCount.past === 0} className={smallBtn} aria-label="Undo" title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={redo} disabled={historyCount.future === 0} className={smallBtn} aria-label="Redo" title="Redo (Ctrl+Y)">
            <Redo2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => void save()} disabled={saving || !dirty} className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs">
        {status?.kind === "error" ? (
          <span className="font-semibold text-danger">{status.text}</span>
        ) : dirty ? (
          <span className="font-semibold text-amber-600">Unsaved changes</span>
        ) : (
          <span className="text-muted">All changes saved</span>
        )}
        <span className="text-muted"> - Plot {data.plot.width} x {data.plot.length} ft ({schedule.plotMarla} Marla) - {data.floors.length} floor{data.floors.length > 1 ? "s" : ""}</span>
      </p>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------------------- Floor plan */}
      {tab === "plan" && mixTip && (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-ink">
          <p>
            <span className="font-bold">The first plan was made automatically.</span> Now adjust it by hand: drag a room to move it, drag the red squares to resize, and change doors and windows in the room panel. You can also change the room list on the right and make the plan again.
          </p>
          <button type="button" onClick={() => setMixTip(false)} className="shrink-0 text-xs font-bold text-primary hover:underline">
            Got it
          </button>
        </div>
      )}
      {tab === "plan" && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {data.floors.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFloorIndex(i);
                    setSelectedId(null);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${i === fi ? "bg-ink text-white" : "border border-border bg-surface text-ink hover:border-primary"}`}
                >
                  {f.name}
                </button>
              ))}
              {data.floors.length < 4 && (
                <button type="button" onClick={addFloor} className={smallBtn}>
                  + Add floor
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => setZoom((z) => Math.max(1, round(z - 0.25)))} className={smallBtn} aria-label="Zoom out">
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-xs font-bold text-muted">{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={() => setZoom((z) => Math.min(3, round(z + 0.25)))} className={smallBtn} aria-label="Zoom in">
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setShowGrid((g) => !g)} className={`${smallBtn} ${showGrid ? "border-primary text-primary" : ""}`} aria-label="Toggle grid" title="Grid">
                  <Grid3x3 className="h-4 w-4" />
                </button>
                <select value={snap} onChange={(e) => setSnap(Number(e.target.value))} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-bold text-ink" aria-label="Snap size">
                  <option value={0.25}>Snap 3 in</option>
                  <option value={0.5}>Snap 6 in</option>
                  <option value={1}>Snap 1 ft</option>
                </select>
              </div>
            </div>

            <div className="max-h-[78vh] overflow-auto rounded-xl border border-border bg-white">
              <PlanEditorCanvas
                design={data}
                floorIndex={fi}
                selectedRoomId={selectedId}
                snap={snap}
                showGrid={showGrid}
                zoom={zoom}
                svgRef={planSvgRef}
                onSelect={setSelectedId}
                onDragStart={() => {
                  dragBeforeRef.current = dataRef.current;
                }}
                onRoomChange={patchRoom}
                onDragEnd={() => {
                  const before = dragBeforeRef.current;
                  dragBeforeRef.current = null;
                  if (before && JSON.stringify(before) !== JSON.stringify(dataRef.current)) checkpoint(before);
                }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              Drag a room to move it, drag the red squares to resize. Rooms click against each other. Arrow keys nudge, Delete removes, Ctrl+Z undoes. Door and window symbols are placed in the room panel.
            </p>
            <button type="button" onClick={() => void downloadPlan()} className={`${smallBtn} mt-2`}>
              <Download className="h-4 w-4" /> Download this floor plan (PNG)
            </button>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="font-heading text-sm font-bold text-ink">Add a room to {floor.name}</h2>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {ROOM_TYPE_ORDER.map((t) => (
                  <button key={t} type="button" onClick={() => addRoom(t)} className="rounded-lg border border-border px-1.5 py-2 text-[11px] font-bold text-ink hover:border-primary" style={{ background: ROOM_SPECS[t].color }}>
                    {ROOM_SPECS[t].label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {fi > 0 && (
                  <button type="button" onClick={copyFromBelow} className={smallBtn}>
                    <Copy className="h-3.5 w-3.5" /> Copy layout from {data.floors[fi - 1].name}
                  </button>
                )}
                {data.floors.length > 1 && fi === data.floors.length - 1 && (
                  <button type="button" onClick={removeFloor} className={`${smallBtn} text-danger`}>
                    <Trash2 className="h-3.5 w-3.5" /> Remove this floor
                  </button>
                )}
              </div>
            </section>

            <details open={startMix} className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <summary className="flex cursor-pointer items-center gap-2 font-heading text-sm font-bold text-ink">
                <Wand2 className="h-4 w-4 text-primary" /> Make the plan automatically
              </summary>
              <p className="mt-2 text-xs text-muted">Choose the rooms you want. A full plan for this plot ({data.plot.width} x {data.plot.length} ft, {data.floors.length} floor{data.floors.length > 1 ? "s" : ""}) replaces what is drawn now.</p>
              <div className="mt-3">
                <AutoPlanFields value={autoCounts} onChange={setAutoCounts} />
              </div>
              <button type="button" onClick={runAutoPlan} className="mt-3 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                <Wand2 className="h-3.5 w-3.5" /> Make the plan
              </button>
              {autoNotes.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-ink">
                  {autoNotes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </details>

            {selected ? (
              <section className="rounded-xl border border-primary/40 bg-surface p-4">
                <h2 className="font-heading text-sm font-bold text-ink">Selected room</h2>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <label className="col-span-2 flex flex-col gap-1 text-[11px] font-semibold text-muted">
                    Name
                    <input value={selected.name} maxLength={40} onChange={(e) => editSelected((r) => (r.name = e.target.value))} className={inputClass} />
                  </label>
                  <label className="col-span-2 flex flex-col gap-1 text-[11px] font-semibold text-muted">
                    Type
                    <select value={selected.type} onChange={(e) => editSelected((r) => (r.type = e.target.value as RoomType))} className={inputClass}>
                      {ROOM_TYPE_ORDER.map((t) => (
                        <option key={t} value={t}>
                          {ROOM_SPECS[t].label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <NumberField label="Width (ft)" value={selected.w} min={2.5} max={data.plot.width} onCommit={(n) => editSelected((r) => (r.w = n))} />
                  <NumberField label="Length (ft)" value={selected.h} min={2.5} max={data.plot.length} onCommit={(n) => editSelected((r) => (r.h = n))} />
                  <NumberField label="From left (ft)" value={selected.x} min={0} max={data.plot.width} onCommit={(n) => editSelected((r) => (r.x = n))} />
                  <NumberField label="From back (ft)" value={selected.y} min={0} max={data.plot.length} onCommit={(n) => editSelected((r) => (r.y = n))} />
                </div>
                <p className="mt-2 text-xs font-semibold text-muted">Area: {roomArea(selected)} sq ft</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={duplicateSelected} className={smallBtn}>
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                  <button type="button" onClick={removeSelected} className={`${smallBtn} text-danger`}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>

                {!ROOM_SPECS[selected.type].open && (
                  <div className="mt-4 border-t border-border pt-3">
                    <h3 className="text-xs font-bold text-ink">Doors and windows</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {OPENING_KIND_ORDER.map((k) => (
                        <button key={k} type="button" onClick={() => addOpening(k)} className={smallBtn}>
                          + {OPENING_SPECS[k].label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 space-y-2">
                      {selected.openings.map((o) => (
                        <div key={o.id} className="rounded-lg bg-surface-muted/60 p-2">
                          <div className="flex items-center gap-2">
                            <select value={o.kind} onChange={(e) => patchOpening(o.id, { kind: e.target.value as OpeningKind })} className={`${inputClass} flex-1`}>
                              {OPENING_KIND_ORDER.map((k) => (
                                <option key={k} value={k}>
                                  {OPENING_SPECS[k].label}
                                </option>
                              ))}
                            </select>
                            <select value={o.side} onChange={(e) => patchOpening(o.id, { side: e.target.value as Side })} className={`${inputClass} flex-1`}>
                              <option value="top">Back wall</option>
                              <option value="bottom">Front wall</option>
                              <option value="left">Left wall</option>
                              <option value="right">Right wall</option>
                            </select>
                            <button type="button" onClick={() => editSelected((r) => (r.openings = r.openings.filter((x) => x.id !== o.id)))} className="text-danger" aria-label="Remove opening">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <NumberField label="Distance from corner (ft)" value={o.offset} min={0} max={200} onCommit={(n) => patchOpening(o.id, { offset: n })} />
                            <NumberField label="Width (ft)" value={o.width} min={0.5} max={30} onCommit={(n) => patchOpening(o.id, { width: n })} />
                          </div>
                        </div>
                      ))}
                      {selected.openings.length === 0 && <p className="text-xs text-muted">No doors or windows yet.</p>}
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <section className="rounded-xl border border-dashed border-border p-4 text-xs text-muted">Click a room on the plan to change its name, size, doors and windows.</section>
            )}

            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="font-heading text-sm font-bold text-ink">Plot and storeys</h2>
              <div className="mt-3 grid grid-cols-3 gap-2.5">
                <NumberField label="Plot width (ft)" value={data.plot.width} min={10} max={400} onCommit={(n) => edit((d) => (d.plot.width = n))} />
                <NumberField label="Plot length (ft)" value={data.plot.length} min={10} max={400} onCommit={(n) => edit((d) => (d.plot.length = n))} />
                <NumberField label="Floor height (ft)" value={data.floorHeight} min={8} max={16} onCommit={(n) => edit((d) => (d.floorHeight = n))} />
              </div>
            </section>

            {warnings.length > 0 && (
              <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                <h2 className="text-xs font-bold text-amber-800">Please check</h2>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-900">
                  {warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ 3D view */}
      {tab === "3d" && (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            {data.floors.length > 1 && (
              <label className="flex items-center gap-2 text-xs font-bold text-ink">
                Show floors
                <select value={Math.min(floorsShown, data.floors.length)} onChange={(e) => setFloorsShown(Number(e.target.value))} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs">
                  {data.floors.map((f, i) => (
                    <option key={f.id} value={i + 1}>
                      Up to {f.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex items-center gap-2 text-xs font-bold text-ink">
              <input type="checkbox" checked={showRoof} onChange={(e) => setShowRoof(e.target.checked)} className="h-4 w-4" /> Roof
            </label>
            <button type="button" onClick={download3d} className={`${smallBtn} ml-auto`}>
              <Download className="h-4 w-4" /> Download picture (PNG)
            </button>
          </div>
          <div className="h-[70vh] min-h-[360px] overflow-hidden rounded-xl border border-border bg-[#dcebf6]">
            <House3DView design={data} floorsShown={Math.min(floorsShown, data.floors.length)} showRoof={showRoof} onCapture={onCapture} />
          </div>
          <p className="mt-2 text-xs text-muted">Drag to turn the house, scroll or pinch to zoom, right-drag to move. Untick Roof to look inside the rooms.</p>
        </div>
      )}

      {/* ----------------------------------------------------------------- Elevation */}
      {tab === "elevation" && (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {(Object.keys(VIEW_LABELS) as ViewName[]).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${v === view ? "bg-ink text-white" : "border border-border bg-surface text-ink hover:border-primary"}`}>
                {VIEW_LABELS[v]}
              </button>
            ))}
            <button type="button" onClick={() => void downloadElevation()} className={`${smallBtn} ml-auto`}>
              <Download className="h-4 w-4" /> Download (PNG)
            </button>
          </div>
          <div className="overflow-auto rounded-xl border border-border bg-white p-2">
            <ElevationSvg design={data} view={view} svgRef={elevSvgRef} className="mx-auto block h-auto w-full max-w-4xl" />
          </div>
          <p className="mt-2 text-xs text-muted">Made from the floor plans: every outside wall, door and window facing that side, the floor slabs, the parapet and the porch. Change the plan and it updates.</p>
        </div>
      )}

      {/* ------------------------------------------------------------------- Details */}
      {tab === "details" && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="font-heading text-sm font-bold text-ink">Design details</h2>
            <div className="mt-3 space-y-3">
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
                Client
                <input value={clientName} maxLength={120} onChange={(e) => setClientName(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
                Construction project
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass}>
                  <option value="">Not linked</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
                Notes
                <textarea value={notes} maxLength={2000} rows={4} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} resize-none`} />
              </label>
            </div>
            <button type="button" onClick={() => void printSheet()} className="mt-4 flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white">
              <Printer className="h-4 w-4" /> Print / Save as PDF
            </button>
            <p className="mt-2 text-xs text-muted">Opens a sheet with the floor plans, all four elevations and the room list. Choose &quot;Save as PDF&quot; in the print window.</p>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="font-heading text-sm font-bold text-ink">Areas</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted">Plot</dt>
              <dd className="text-right font-semibold">{schedule.plotArea} sq ft ({schedule.plotMarla} Marla)</dd>
              {schedule.floorAreas.map((f) => (
                <FloorAreaRow key={f.name} name={f.name} covered={f.covered} />
              ))}
              <dt className="text-muted">Total covered area</dt>
              <dd className="text-right font-semibold">{schedule.totalCovered} sq ft</dd>
              <dt className="text-muted">Ground floor coverage</dt>
              <dd className="text-right font-semibold">{schedule.groundCoveragePct}% of plot</dd>
            </dl>
            <h3 className="mt-5 text-xs font-bold text-ink">Room list</h3>
            <div className="mt-2 max-h-80 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted">
                  <tr>
                    <th className="py-1 pr-2 font-semibold">Floor</th>
                    <th className="py-1 pr-2 font-semibold">Room</th>
                    <th className="py-1 pr-2 font-semibold">Size</th>
                    <th className="py-1 text-right font-semibold">Area</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.rows.map((r, i) => (
                    <tr key={i} className="border-t border-border/60">
                      <td className="py-1 pr-2 text-muted">{r.floor}</td>
                      <td className="py-1 pr-2 font-semibold text-ink">{r.name}</td>
                      <td className="py-1 pr-2">
                        {r.w}&apos; x {r.h}&apos;
                      </td>
                      <td className="py-1 text-right">{r.area}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {schedule.rows.length === 0 && <p className="py-3 text-xs text-muted">No rooms yet.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function FloorAreaRow({ name, covered }: { name: string; covered: number }) {
  return (
    <>
      <dt className="text-muted">{name} (covered)</dt>
      <dd className="text-right font-semibold">{covered} sq ft</dd>
    </>
  );
}
