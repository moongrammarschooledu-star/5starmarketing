"use client";

import { useEffect, useRef, useState } from "react";
import type * as T from "three";
import { BOUNDARY_T, PARAPET, PLINTH, ROOM_SPECS, SLAB, WALL_INNER, WALL_OUTER } from "@/lib/house/catalog";
import { absOpenings, boundaryLayout, cutWall, levels, topUsedFloor, totalHeight, wallSegments } from "@/lib/house/geometry";
import type { DesignData, Room } from "@/lib/house/types";

type Three = typeof import("three");

interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

/** Builds every wall, slab, window and door of the house as simple boxes.
 *  Plan x -> world x, plan y -> world z, height -> world y, all in feet and
 *  centred on the plot. */
function buildHouse(THREE: Three, design: DesignData, floorsShown: number, showRoof: boolean) {
  const { width: W, length: L } = design.plot;
  const group = new THREE.Group();
  const geometries: T.BufferGeometry[] = [];
  const materials: T.Material[] = [];

  const mat = (color: number | string, opts: T.MeshStandardMaterialParameters = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...opts });
    materials.push(m);
    return m;
  };
  const wallMat = mat("#f0e8da");
  const slabMat = mat("#cfcfcf");
  const plinthMat = mat("#a8a294");
  const glassMat = mat("#8fd0f5", { transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.2 });
  const doorMat = mat("#8a5a2b");
  const pillarMat = mat("#e3dccd");
  const railMat = mat("#d9e6ee", { transparent: true, opacity: 0.6 });
  const grassMat = mat("#7fbf5a");
  const groundMat = mat("#d8d2bf");
  const roadMat = mat("#5d5f66");
  const stepMat = mat("#bdbdbd");
  const floorMats = new Map<string, T.MeshStandardMaterial>();
  const floorMat = (color: string) => {
    let m = floorMats.get(color);
    if (!m) {
      m = mat(color);
      floorMats.set(color, m);
    }
    return m;
  };

  /** A box given by plan ranges and a height range. */
  const box = (m: T.Material, px0: number, px1: number, py0: number, py1: number, h0: number, h1: number, shadows = true) => {
    if (px1 - px0 < 0.001 || py1 - py0 < 0.001 || h1 - h0 < 0.001) return;
    const g = new THREE.BoxGeometry(px1 - px0, h1 - h0, py1 - py0);
    geometries.push(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set((px0 + px1) / 2 - W / 2, (h0 + h1) / 2, (py0 + py1) / 2 - L / 2);
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  // Ground, plot and road.
  box(grassMat, -40, W + 40, -40, L + 40, -0.4, -0.02, false);
  box(groundMat, 0, W, 0, L, -0.02, 0.03, false);
  box(roadMat, -40, W + 40, L + 3, L + 19, -0.1, 0.05, false);

  // The boundary wall around the plot, with its gates.
  const bl = boundaryLayout(design);
  if (bl.pieces.length > 0) {
    const boundaryMat = mat("#e3dccd");
    const pillarDark = mat("#4a4a4f");
    const gateMat = mat("#2a2a2d");
    const gateWood = mat("#7a4a2a");
    const t = BOUNDARY_T;
    for (const p of bl.pieces) {
      if (p.orient === "h") box(boundaryMat, p.a - (p.a === 0 ? t / 2 : 0), p.b + (p.b === W ? t / 2 : 0), p.c - t / 2, p.c + t / 2, 0, bl.height);
      else box(boundaryMat, p.c - t / 2, p.c + t / 2, p.a - (p.a === 0 ? t / 2 : 0), p.b + (p.b === L ? t / 2 : 0), 0, bl.height);
    }
    for (const gt of bl.gates) {
      const main = gt.kind === "main";
      const gh = bl.height - 0.3;
      const leaves = main ? 2 : 1;
      const run = (gt.b - gt.a) / leaves;
      for (let k = 0; k < leaves; k++) {
        const a0 = gt.a + k * run + 0.05;
        const a1 = gt.a + (k + 1) * run - 0.05;
        if (gt.orient === "h") {
          box(gateMat, a0, a1, gt.c - 0.1, gt.c + 0.1, 0.25, gh);
          box(gateWood, a0 + 0.15, a1 - 0.15, gt.c - 0.14, gt.c + 0.14, 0.45, Math.min(gh - 0.7, 3.4));
        } else {
          box(gateMat, gt.c - 0.1, gt.c + 0.1, a0, a1, 0.25, gh);
          box(gateWood, gt.c - 0.14, gt.c + 0.14, a0 + 0.15, a1 - 0.15, 0.45, Math.min(gh - 0.7, 3.4));
        }
      }
      for (const edge of [gt.a - 0.9, gt.b]) {
        if (gt.orient === "h") box(pillarDark, edge, edge + 0.9, gt.c - 0.5, gt.c + 0.5, 0, bl.height + 0.8);
        else box(pillarDark, gt.c - 0.5, gt.c + 0.5, edge, edge + 0.9, 0, bl.height + 0.8);
      }
    }
  }

  const half = WALL_OUTER / 2;
  const shownFloors = Math.min(floorsShown, design.floors.length);
  const lv = levels(design);
  const H = design.floorHeight;

  for (let f = 0; f < shownFloors; f++) {
    const floor = design.floors[f];
    const level = lv[f];
    const isTopShown = f === Math.min(shownFloors - 1, topUsedFloor(design));
    const isTopFloor = f === topUsedFloor(design);
    // A stair well only has a hole in the slab where the next floor has stairs too.
    const hasUpperStairs = design.floors[f + 1]?.rooms.some((x) => x.type === "stairs") ?? false;
    const hasLowerStairs = design.floors[f - 1]?.rooms.some((x) => x.type === "stairs") ?? false;
    const hasLower = f > 0;
    const openings = absOpenings(floor.rooms);

    // Slabs and floor finishes.
    for (const r of floor.rooms) {
      const spec = ROOM_SPECS[r.type];
      if (r.type === "lawn" || r.type === "grass") {
        box(floorMat(spec.floor), r.x, r.x + r.w, r.y, r.y + r.h, 0.03, 0.2, false);
        continue;
      }
      if (r.type === "plants" || r.type === "tree") {
        const leaf = floorMat("#4f9a3c");
        const leaf2 = floorMat("#6db553");
        const sphere = (px: number, py: number, pz: number, rad: number, m: T.Material) => {
          const g = new THREE.SphereGeometry(rad, 12, 10);
          geometries.push(g);
          const mesh = new THREE.Mesh(g, m);
          mesh.position.set(px - W / 2, py, pz - L / 2);
          mesh.castShadow = true;
          group.add(mesh);
        };
        if (r.type === "tree") {
          const cxp = r.x + r.w / 2;
          const cyp = r.y + r.h / 2;
          box(floorMat("#5a4030"), cxp - 0.3, cxp + 0.3, cyp - 0.3, cyp + 0.3, 0, 4.5);
          const rad = Math.max(2.2, Math.min(r.w, r.h) / 2);
          sphere(cxp, 4.5 + rad * 0.8, cyp, rad, leaf);
          sphere(cxp + rad * 0.45, 4.5 + rad * 0.55, cyp - rad * 0.3, rad * 0.7, leaf2);
        } else {
          box(floorMat("#6b6258"), r.x, r.x + r.w, r.y, r.y + r.h, 0.03, 0.6);
          const along = r.w >= r.h;
          const n = Math.max(1, Math.floor((along ? r.w : r.h) / 1.8));
          for (let i = 0; i < n; i++) {
            const tt = ((i + 0.5) / n) * (along ? r.w : r.h);
            const rad = Math.min(0.85, (along ? r.h : r.w) / 2);
            sphere(along ? r.x + tt : r.x + r.w / 2, 0.6 + rad * 0.8, along ? r.y + r.h / 2 : r.y + tt, rad, i % 2 ? leaf2 : leaf);
          }
        }
        continue;
      }
      if (r.type === "footpath") {
        box(floorMat(spec.floor), r.x, r.x + r.w, r.y, r.y + r.h, 0.03, 0.14, false);
        continue;
      }
      const x0 = r.x - half;
      const x1 = r.x + r.w + half;
      const y0 = r.y - half;
      const y1 = r.y + r.h + half;
      if (f === 0) box(plinthMat, r.x, r.x + r.w, r.y, r.y + r.h, 0, PLINTH);
      const isStairs = r.type === "stairs";
      if (hasLower && !(isStairs && hasLowerStairs)) box(slabMat, x0, x1, y0, y1, level.z0 - SLAB, level.z0);
      box(floorMat(spec.floor), r.x, r.x + r.w, r.y, r.y + r.h, level.z0, level.z0 + 0.04, false);
      const ceiling = !spec.open || r.type === "porch";
      if (ceiling && !(isStairs && hasUpperStairs) && (!isTopShown || showRoof)) {
        box(slabMat, spec.open ? r.x : x0, spec.open ? r.x + r.w : x1, spec.open ? r.y : y0, spec.open ? r.y + r.h : y1, level.z1, level.z1 + SLAB);
      }
      if (r.type === "porch") {
        for (const [px, py] of [[r.x, r.y], [r.x + r.w - 1, r.y], [r.x, r.y + r.h - 1], [r.x + r.w - 1, r.y + r.h - 1]]) {
          box(pillarMat, px, px + 1, py, py + 1, level.z0, level.z1);
        }
      }
      if (r.type === "balcony") {
        box(slabMat, r.x, r.x + r.w, r.y, r.y + r.h, level.z0 - SLAB, level.z0);
        const t = 0.25;
        const top = level.z0 + 3;
        box(railMat, r.x, r.x + r.w, r.y, r.y + t, level.z0, top, false);
        box(railMat, r.x, r.x + r.w, r.y + r.h - t, r.y + r.h, level.z0, top, false);
        box(railMat, r.x, r.x + t, r.y, r.y + r.h, level.z0, top, false);
        box(railMat, r.x + r.w - t, r.x + r.w, r.y, r.y + r.h, level.z0, top, false);
      }
      if (r.type === "stairs") addStairs(r, level.z0, H, box, stepMat);
    }

    // Walls with their door and window openings.
    for (const seg of wallSegments(floor.rooms)) {
      const t = seg.exterior ? WALL_OUTER : WALL_INNER;
      const { pieces, cuts } = cutWall(seg, openings, H);
      const wallBox = (m: T.Material, a: number, b: number, h0: number, h1: number, thick: number) => {
        if (seg.orient === "h") box(m, a, b, seg.c - thick / 2, seg.c + thick / 2, level.z0 + h0, level.z0 + h1);
        else box(m, seg.c - thick / 2, seg.c + thick / 2, a, b, level.z0 + h0, level.z0 + h1);
      };
      for (const p of pieces) {
        const a = p.a - (Math.abs(p.a - seg.a) < 0.001 ? t / 2 : 0);
        const b = p.b + (Math.abs(p.b - seg.b) < 0.001 ? t / 2 : 0);
        wallBox(wallMat, a, b, p.z0, p.z1, t);
      }
      for (const c of cuts) {
        if (c.kind === "door" || c.kind === "main_door") wallBox(doorMat, c.a + 0.05, c.b - 0.05, c.sill, c.top, 0.18);
        else wallBox(glassMat, c.a, c.b, c.sill, c.top, 0.12);
      }
      // Parapet around the roof.
      if (isTopFloor && isTopShown && showRoof && seg.exterior) {
        wallBox(wallMat, seg.a - t / 2, seg.b + t / 2, H + SLAB, H + SLAB + PARAPET, 0.4);
      }
    }
  }

  return { group, geometries, materials, W, L, height: totalHeight(design) };
}

function addStairs(
  r: Room,
  z0: number,
  storeyHeight: number,
  box: (m: T.Material, px0: number, px1: number, py0: number, py1: number, h0: number, h1: number, shadows?: boolean) => void,
  m: T.Material
) {
  const steps = Math.max(4, Math.round(storeyHeight / 0.55));
  const rise = storeyHeight / steps;
  const vertical = r.h >= r.w;
  const run = (vertical ? r.h : r.w) / steps;
  for (let i = 0; i < steps; i++) {
    const top = z0 + rise * (i + 1);
    if (vertical) box(m, r.x + 0.2, r.x + r.w - 0.2, r.y + r.h - run * (i + 1), r.y + r.h - run * i, z0, top);
    else box(m, r.x + run * i, r.x + run * (i + 1), r.y + 0.2, r.y + r.h - 0.2, z0, top);
  }
}

export interface House3DProps {
  design: DesignData;
  floorsShown: number;
  showRoof: boolean;
  /** Receives a function that returns the current picture as a PNG data URL. */
  onCapture?: (capture: (() => string | null) | null) => void;
}

export function House3DView({ design, floorsShown, showRoof, onCapture }: House3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<CameraState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let teardown: (() => void) | null = null;

    (async () => {
      try {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        const mount = mountRef.current;
        if (cancelled || !mount) return;

        const built = buildHouse(THREE, design, floorsShown, showRoof);
        const { W, L, height } = built;
        const reach = Math.max(W, L);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#dcebf6");
        scene.add(built.group);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x8c8a78, 1.05));
        const sun = new THREE.DirectionalLight(0xffffff, 1.6);
        sun.position.set(W * 0.9, reach * 1.1 + height, L * 0.8);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        const s = reach * 0.9;
        Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: reach * 4 + height * 2 });
        sun.shadow.bias = -0.0005;
        scene.add(sun);

        const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        mount.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";

        const camera = new THREE.PerspectiveCamera(42, 1, 0.5, reach * 20);
        const saved = cameraRef.current;
        if (saved) {
          camera.position.set(...saved.position);
        } else {
          camera.position.set(W * 0.85, height * 1.05 + reach * 0.45, L * 0.5 + reach * 1.05);
        }
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(...(saved ? saved.target : ([0, height * 0.35, 0] as [number, number, number])));
        controls.enableDamping = true;
        controls.maxPolarAngle = Math.PI / 2 - 0.03;
        controls.minDistance = 8;
        controls.maxDistance = reach * 6;
        controls.update();

        const resize = () => {
          const w = mount.clientWidth || 600;
          const h = mount.clientHeight || 400;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(mount);

        let frame = 0;
        const loop = () => {
          frame = requestAnimationFrame(loop);
          controls.update();
          renderer.render(scene, camera);
        };
        loop();

        onCapture?.(() => {
          renderer.render(scene, camera);
          return renderer.domElement.toDataURL("image/png");
        });

        teardown = () => {
          cameraRef.current = {
            position: [camera.position.x, camera.position.y, camera.position.z],
            target: [controls.target.x, controls.target.y, controls.target.z],
          };
          cancelAnimationFrame(frame);
          observer.disconnect();
          controls.dispose();
          built.geometries.forEach((g) => g.dispose());
          built.materials.forEach((m) => m.dispose());
          renderer.dispose();
          renderer.domElement.remove();
          onCapture?.(null);
        };
        if (cancelled) teardown();
      } catch (e) {
        console.error("3D view failed:", e);
        if (!cancelled) setError("Your browser could not start the 3D view (WebGL is needed).");
      }
    })();

    return () => {
      cancelled = true;
      teardown?.();
    };
    // onCapture is a stable setter from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, floorsShown, showRoof]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      {error && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}
