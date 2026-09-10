"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertCircle, Search, Building2, FolderKanban } from "lucide-react";
import clsx from "clsx";
import type { Property } from "@/lib/models/property";
import type { Project } from "@/lib/models/project";
import { brochureSectionKeys, brochureSectionLabels } from "@/lib/models/brochure";
import { createBrochureAction, type BrochureFormState } from "@/lib/actions/brochure.actions";

type Target = { id: string; name: string; location: string; type: string; slug: string };

export function CreateBrochureForm({ properties, projects }: { properties: Property[]; projects: Project[] }) {
  const [state, formAction, pending] = useActionState<BrochureFormState, FormData>(createBrochureAction, {});
  const [tab, setTab] = useState<"property" | "project">("property");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Target | null>(null);
  const [title, setTitle] = useState("");

  const propertyTargets: Target[] = properties.map((p) => ({ id: p.id, name: p.title, location: p.location, type: p.type, slug: p.slug }));
  const projectTargets: Target[] = projects.map((p) => ({ id: p.id, name: p.name, location: p.location, type: p.type, slug: p.slug }));
  const targets = tab === "property" ? propertyTargets : projectTargets;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter(
      (t) => t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.id.includes(q)
    );
  }, [targets, search]);

  function select(t: Target) {
    setSelected(t);
    setTitle(`${t.name} Brochure`);
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {state.error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Step 1 — Select {tab === "property" ? "Property" : "Project"}</h2>

        <div className="mt-3 flex gap-1.5 rounded-full border border-border bg-surface-muted p-1">
          <button
            type="button"
            onClick={() => { setTab("property"); setSelected(null); }}
            className={clsx("flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold", tab === "property" ? "bg-primary text-primary-foreground" : "text-muted")}
          >
            <Building2 className="h-3.5 w-3.5" /> Property
          </button>
          <button
            type="button"
            onClick={() => { setTab("project"); setSelected(null); }}
            className={clsx("flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold", tab === "project" ? "bg-primary text-primary-foreground" : "text-muted")}
          >
            <FolderKanban className="h-3.5 w-3.5" /> Project
          </button>
        </div>

        <input type="hidden" name="type" value={tab} />
        <input type="hidden" name="targetId" value={selected?.id ?? ""} />

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, location, type or ID..."
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-primary"
          />
        </div>

        <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
          {filtered.length === 0 && <p className="py-6 text-center text-sm text-muted">No matches.</p>}
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => select(t)}
              className={clsx(
                "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm transition-colors",
                selected?.id === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              )}
            >
              <div>
                <div className="font-bold text-ink">{t.name}</div>
                <div className="text-xs text-muted">{t.location} · {t.type}</div>
              </div>
              {selected?.id === t.id && <span className="text-xs font-bold text-primary">Selected</span>}
            </button>
          ))}
        </div>
      </section>

      {selected && (
        <>
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-heading text-base font-bold text-ink">Brochure Title</h2>
            <input
              type="text"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-3 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-heading text-base font-bold text-ink">Step 2 — Sections to Include</h2>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {brochureSectionKeys.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    name="sections"
                    value={key}
                    defaultChecked
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  {brochureSectionLabels[key]}
                </label>
              ))}
            </div>
          </section>

          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {pending ? "Creating..." : "Create Brochure"}
          </button>
        </>
      )}
    </form>
  );
}
