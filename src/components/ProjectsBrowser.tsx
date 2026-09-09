"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ProjectCard } from "./ProjectCard";
import { projectStatuses, type Project, type ProjectStatus } from "@/lib/models/project";

const ALL = "All";

export function ProjectsBrowser({ projects }: { projects: Project[] }) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);
  const [status, setStatus] = useState<ProjectStatus | typeof ALL>(ALL);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const locations = useMemo(() => [ALL, ...new Set(projects.map((p) => p.location))], [projects]);
  const types = useMemo(() => [ALL, ...new Set(projects.map((p) => p.type))], [projects]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.location.toLowerCase().includes(q)) return false;
      if (location !== ALL && p.location !== location) return false;
      if (type !== ALL && p.type !== type) return false;
      if (status !== ALL && p.status !== status) return false;
      return true;
    });
  }, [projects, query, location, type, status]);

  function handleReset() {
    setQuery("");
    setLocation(ALL);
    setType(ALL);
    setStatus(ALL);
  }

  return (
    <div>
      <div className="rounded-2xl border border-border bg-surface-muted p-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects by name or location..."
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-primary"
          />
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="mt-3 flex w-full items-center justify-between text-sm font-bold text-ink lg:hidden"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" /> Filters
          </span>
          {filtersOpen ? <X className="h-4 w-4" /> : <span className="text-primary">Show</span>}
        </button>

        <div className={`${filtersOpen ? "mt-4 grid" : "hidden"} grid-cols-2 gap-3 sm:grid-cols-3 lg:mt-3 lg:grid lg:grid-cols-3`}>
          <Filter label="Location" value={location} onChange={setLocation} options={locations} />
          <Filter label="Project Type" value={type} onChange={setType} options={types} />
          <Filter label="Status" value={status} onChange={(v) => setStatus(v as typeof status)} options={[ALL, ...projectStatuses]} />
        </div>

        <div className={`${filtersOpen ? "flex" : "hidden"} mt-4 lg:flex`}>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <p className="mt-6 text-sm font-medium text-muted">
        Showing {results.length} of {projects.length} {projects.length === 1 ? "project" : "projects"}
      </p>

      {results.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Search className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-semibold text-ink">No projects match those filters</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Try a different search, or contact us on WhatsApp and we&apos;ll help you find the right
            project.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none transition-colors focus:border-primary"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
